import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { MedicationRequest } from '@curo/shared/database';
import {
  MedicationRequestStatus,
  NotificationEventType,
  UserRole,
} from '@curo/shared/enums';
import type { AuthUser } from '@curo/shared/auth';
import { notifyRole } from '@curo/shared/notifications';
import {
  parsePagination,
  toSearchset,
  PaginationQuery,
  SearchQuery,
} from '@curo/shared/fhir';
import { MedicationDispense } from '../entities/medication-dispense.entity';
import { Stock } from '../entities/stock.entity';
import { MedicationCatalog } from '../entities/medication-catalog.entity';
import { DispenseMedicationDto } from './dto/dispense.dto';
import { CreateStockDto, UpdateStockDto } from './dto/stock.dto';
import { MedicationDispenseStatus } from '../enums';
import { byExpiry, planFefoDraws } from './fefo';
import { lowStockAfterDraw, type LowStock } from './reorder-level';

/** What one stock batch supplied to a dispense. */
interface BatchDraw {
  batchNumber: string | null;
  quantity: number;
  unitPrice: number;
}

/** What a dispense took from stock, and whether that left the drug low. */
interface StockDraw {
  draws: BatchDraw[];
  lowStock: (LowStock & { unit: string | null }) | null;
}

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

/** Optional filters for GET /dispense. */
export interface DispenseHistoryFilter {
  patientId?: string;
  prescriptionId?: string;
}

export type StockBatch = Pick<
  Stock,
  | 'id'
  | 'batchNumber'
  | 'quantity'
  | 'expiryDate'
  | 'unitPrice'
  | 'supplier'
  | 'storageLocation'
>;

/** One drug's stock across all of its batches. */
export interface StockGroup extends Pick<
  Stock,
  | 'medicationCode'
  | 'medicationName'
  | 'genericName'
  | 'form'
  | 'strength'
  | 'unit'
  | 'reorderThreshold'
> {
  totalQuantity: number;
  batches: StockBatch[];
}

function toFhirDispense(d: MedicationDispense) {
  return {
    resourceType: 'MedicationDispense',
    id: d.id,
    status: d.status,
    medicationCodeableConcept: {
      coding: [{ code: d.medicationCode, display: d.medicationDisplay }],
    },
    subject: { reference: `Patient/${d.patientId}` },
    authorizingPrescription: [
      { reference: `MedicationRequest/${d.medicationRequestId}` },
    ],
    quantity: { value: d.quantityValue, unit: d.quantityUnit },
    daysSupply: d.daysSupply,
    dosageInstruction: d.dosageText ? [{ text: d.dosageText }] : undefined,
    whenHandedOver: d.whenHandedOver,
    note: d.note ? [{ text: d.note }] : undefined,
    extension: [
      { url: 'urn:curo:dispenserName', valueString: d.dispenserName },
      { url: 'urn:curo:unitPrice', valueDecimal: d.unitPrice },
      { url: 'urn:curo:totalPrice', valueDecimal: d.totalPrice },
      { url: 'urn:curo:receiptNumber', valueString: d.receiptNumber },
      { url: 'urn:curo:batchNumber', valueString: d.batchNumber },
    ],
  };
}

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(MedicationRequest)
    private medsRepo: Repository<MedicationRequest>,
    @InjectRepository(MedicationDispense)
    private dispenseRepo: Repository<MedicationDispense>,
    @InjectRepository(Stock)
    private stockRepo: Repository<Stock>,
    @InjectRepository(MedicationCatalog)
    private catalogRepo: Repository<MedicationCatalog>,
  ) {}

  // Prescribing reference catalog — searchable, paginated FHIR searchset Bundle.
  async getMedicationCatalog(query: SearchQuery = {}) {
    const { skip, take, page, pageSize } = parsePagination(query);
    const qb = this.catalogRepo
      .createQueryBuilder('m')
      .where('m.active = true');
    if (query.search) {
      qb.andWhere(
        '(m.name ILIKE :s OR m.genericName ILIKE :s OR m.atc ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    const [rows, total] = await qb
      .orderBy('m.name', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(rows, total, {
      page,
      pageSize,
      baseUrl: '/medication-catalog',
      query: { search: query.search },
    });
  }

  /**
   * Draw `qty` units of a drug from stock, FEFO (see fefo.ts), across several
   * batches if needed. The drug's batches are row-locked, so concurrent
   * dispenses of it can't lose updates, and only one of them can be the draw
   * that takes the drug to its reorder level. Throws 409 when stock can't
   * cover `qty`, so nothing is dispensed unpriced or left out of the count.
   */
  private async drawStockFEFO(
    em: EntityManager,
    rx: Pick<MedicationRequest, 'medicationCode' | 'medicationDisplay'>,
    qty: number,
  ): Promise<StockDraw> {
    const batches = await em
      .getRepository(Stock)
      .createQueryBuilder('s')
      .where('s.medicationCode = :code AND s.active = true', {
        code: rx.medicationCode,
      })
      .orderBy('s.id') // one lock order, so two dispenses can't deadlock
      .setLock('pessimistic_write')
      .getMany();

    const today = new Date().toISOString().slice(0, 10);
    const draws = planFefoDraws(batches, qty, today);
    const available = draws.reduce((sum, d) => sum + d.quantity, 0);
    if (available < qty) {
      throw new ConflictException(
        `Not enough ${rx.medicationDisplay} in stock: ${available} available, ` +
          `${qty} needed. Receive stock before dispensing.`,
      );
    }

    // Read before the batches are drawn down below.
    const lowStock = lowStockAfterDraw(batches, qty, today);

    for (const { batch, quantity } of draws) batch.quantity -= quantity;
    await em.save(draws.map((d) => d.batch));
    return {
      draws: draws.map(({ batch, quantity }) => ({
        batchNumber: batch.batchNumber,
        quantity,
        unitPrice: Number(batch.unitPrice ?? 0), // decimal columns arrive as strings
      })),
      lowStock: lowStock && { ...lowStock, unit: batches[0].unit ?? null },
    };
  }

  async dispense(dto: DispenseMedicationDto, pharmacist: AuthUser) {
    const prescription = await this.medsRepo.findOne({
      where: { id: dto.medicationRequestId },
    });
    if (!prescription)
      throw new NotFoundException(
        `Prescription ${dto.medicationRequestId} not found`,
      );
    const qty = dto.quantityValue || prescription.quantityValue || 1;

    const saved = await this.dispenseRepo.manager.transaction(async (em) => {
      // Claim the prescription first. A concurrent dispense waits on this row,
      // then matches nothing and gets the 409, which rolls its transaction back.
      const { affected } = await em.update(
        MedicationRequest,
        { id: prescription.id, status: MedicationRequestStatus.ACTIVE },
        { status: MedicationRequestStatus.COMPLETED },
      );
      if (!affected)
        throw new ConflictException(
          `Prescription ${prescription.id} is no longer active`,
        );

      const { draws, lowStock } = await this.drawStockFEFO(
        em,
        prescription,
        qty,
      );
      if (lowStock)
        await notifyRole(em, UserRole.PHARMACIST, {
          eventType: NotificationEventType.LOW_STOCK_ALERT,
          title: 'Low stock',
          message:
            `${prescription.medicationDisplay} is low: ${lowStock.remaining} ` +
            `${lowStock.unit ?? 'units'} left (reorder at ${lowStock.reorderLevel}).`,
          relatedResourceType: 'Medication',
          relatedResourceId: prescription.medicationCode,
        });
      const totalPrice = roundMoney(
        draws.reduce((sum, d) => sum + d.quantity * d.unitPrice, 0),
      );

      return em.save(
        em.create(MedicationDispense, {
          medicationRequestId: prescription.id,
          patientId: prescription.patientId,
          pharmacistId: pharmacist.userId,
          dispenserName: pharmacist.name ?? pharmacist.email,
          status: MedicationDispenseStatus.COMPLETED,
          medicationCode: prescription.medicationCode,
          medicationDisplay: prescription.medicationDisplay,
          quantityValue: qty,
          quantityUnit: dto.quantityUnit || prescription.quantityUnit,
          dosageText: prescription.dosageText,
          unitPrice: roundMoney(totalPrice / qty),
          totalPrice,
          receiptNumber: `RX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          batchNumber:
            draws
              .filter((d) => d.batchNumber)
              .map((d) => `${d.batchNumber}×${d.quantity}`)
              .join(', ') || undefined,
          note: dto.note,
          whenHandedOver: new Date(),
        }),
      );
    });

    return toFhirDispense(saved);
  }

  async getDispenseHistory(
    filter: DispenseHistoryFilter,
    pagination: PaginationQuery = {},
  ) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const { patientId, prescriptionId } = filter;
    const where = {
      ...(patientId ? { patientId } : {}),
      ...(prescriptionId ? { medicationRequestId: prescriptionId } : {}),
    };
    const [dispenses, total] = await this.dispenseRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return toSearchset(dispenses.map(toFhirDispense), total, {
      page,
      pageSize,
      baseUrl: '/dispense',
      query: { patientId, prescriptionId },
    });
  }

  async getDispense(id: string) {
    const d = await this.dispenseRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException(`Dispense record ${id} not found`);
    return toFhirDispense(d);
  }

  // Stock management → FHIR searchset Bundle (paginated).
  async getStock(
    lowOnly?: boolean,
    organizationId?: string,
    pagination: PaginationQuery = {},
  ) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const qb = this.stockRepo.createQueryBuilder('s').where('s.active = true');
    if (lowOnly) qb.andWhere('s.quantity <= s.reorderThreshold');
    if (organizationId)
      qb.andWhere('s.organizationId = :org', { org: organizationId });
    const [stock, total] = await qb
      .orderBy('s.medicationName', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(stock, total, {
      page,
      pageSize,
      baseUrl: '/stock',
      query: { lowOnly: lowOnly ? 'true' : undefined, organizationId },
    });
  }

  /**
   * Stock grouped by drug, with each drug's batches listed by expiry (FEFO order).
   * Multiple batches of the same drug with different expiry dates are separate rows.
   */
  async getGroupedStock(): Promise<StockGroup[]> {
    const rows = await this.stockRepo.find({
      where: { active: true },
      order: { medicationName: 'ASC' },
    });
    const groups = new Map<string, StockGroup>();
    for (const s of rows) {
      const g = groups.get(s.medicationCode) ?? {
        medicationCode: s.medicationCode,
        medicationName: s.medicationName,
        genericName: s.genericName,
        form: s.form,
        strength: s.strength,
        unit: s.unit,
        reorderThreshold: s.reorderThreshold,
        totalQuantity: 0,
        batches: [],
      };
      g.totalQuantity += s.quantity;
      g.batches.push({
        id: s.id,
        batchNumber: s.batchNumber,
        quantity: s.quantity,
        expiryDate: s.expiryDate,
        unitPrice: s.unitPrice,
        supplier: s.supplier,
        storageLocation: s.storageLocation,
      });
      groups.set(s.medicationCode, g);
    }
    const result = Array.from(groups.values());
    for (const g of result) g.batches.sort(byExpiry);
    return result;
  }

  async addStock(dto: CreateStockDto): Promise<Stock> {
    const item = this.stockRepo.create(dto);
    return this.stockRepo.save(item);
  }

  async updateStock(id: string, dto: UpdateStockDto): Promise<Stock> {
    const item = await this.stockRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Stock item ${id} not found`);
    Object.assign(item, dto);
    return this.stockRepo.save(item);
  }

  async getLowStockAlerts(): Promise<Stock[]> {
    return this.stockRepo
      .createQueryBuilder('s')
      .where('s.quantity <= s."reorderThreshold" AND s.active = true')
      .getMany();
  }
}
