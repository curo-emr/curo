import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { MedicationRequest } from '@curo/shared/database';
import {
  MedicationRequestStatus,
  NotificationEventType,
  UserRole,
} from '@curo/shared/enums';
import type { AuthUser } from '@curo/shared/auth';
import { notifyRole } from '@curo/shared/notifications';
import {
  escapeLike,
  parseList,
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
import {
  isLow,
  lowStockAfterDraw,
  stockLevel,
  type StockLevel,
} from './reorder-level';
import { dispenseScope, pharmacyOf, stockScope } from './pharmacy-scope';

/** What one stock batch supplied to a dispense. */
interface BatchDraw {
  batchNumber: string | null;
  quantity: number;
  unitPrice: number;
}

/** What a dispense took from stock, and whether that left the drug low. */
interface StockDraw {
  draws: BatchDraw[];
  lowStock: (StockLevel & { unit: string | null }) | null;
}

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

/** Today as an ISO date (YYYY-MM-DD), the form `expiryDate` is stored in. */
const isoToday = () => new Date().toISOString().slice(0, 10);

/** Optional filters for GET /dispense. */
export interface DispenseHistoryFilter {
  /** The pharmacy dispensed at; a pharmacist always gets their own. */
  organizationId?: string;
  patientId?: string;
  prescriptionId?: string;
  /** The start of a prescription id, or part of a medication's name. */
  search?: string;
  /** With `search`: the patients whose name matched it, whose dispenses match too. */
  searchPatientIds?: string;
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
export interface StockGroup
  extends
    Pick<
      Stock,
      | 'organizationId'
      | 'medicationCode'
      | 'medicationName'
      | 'genericName'
      | 'form'
      | 'strength'
      | 'unit'
    >,
    StockLevel {
  /** At or below its reorder level (see reorder-level.ts). */
  low: boolean;
  /** FEFO order: the batch dispensed from next comes first. */
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
      .addOrderBy('m.id', 'ASC')
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
   * Draw `qty` units of a drug from one pharmacy's stock, FEFO (see fefo.ts),
   * across several batches if needed. The drug's batches are row-locked, so concurrent
   * dispenses of it can't lose updates, and only one of them can be the draw
   * that takes the drug to its reorder level. Throws 409 when stock can't
   * cover `qty`, so nothing is dispensed unpriced or left out of the count.
   */
  private async drawStockFEFO(
    em: EntityManager,
    organizationId: string,
    rx: Pick<MedicationRequest, 'medicationCode' | 'medicationDisplay'>,
    qty: number,
  ): Promise<StockDraw> {
    const batches = await em
      .getRepository(Stock)
      .createQueryBuilder('s')
      .where(
        's.organizationId = :org AND s.medicationCode = :code AND s.active = true',
        { org: organizationId, code: rx.medicationCode },
      )
      .orderBy('s.id') // one lock order, so two dispenses can't deadlock
      .setLock('pessimistic_write')
      .getMany();

    const today = isoToday();
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

  /** Dispenses a prescription from the pharmacist's own pharmacy's stock. */
  async dispense(dto: DispenseMedicationDto, pharmacist: AuthUser) {
    const pharmacy = pharmacyOf(pharmacist);
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
        pharmacy,
        prescription,
        qty,
      );
      if (lowStock)
        await notifyRole(
          em,
          UserRole.PHARMACIST,
          {
            eventType: NotificationEventType.LOW_STOCK_ALERT,
            title: 'Low stock',
            message:
              `${prescription.medicationDisplay} is low: ${lowStock.usableQuantity} ` +
              `${lowStock.unit ?? 'units'} left (reorder at ${lowStock.reorderLevel}).`,
            relatedResourceType: 'Medication',
            relatedResourceId: prescription.medicationCode,
          },
          { organizationId: pharmacy },
        );
      const totalPrice = roundMoney(
        draws.reduce((sum, d) => sum + d.quantity * d.unitPrice, 0),
      );

      return em.save(
        em.create(MedicationDispense, {
          medicationRequestId: prescription.id,
          patientId: prescription.patientId,
          pharmacistId: pharmacist.userId,
          organizationId: pharmacy,
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

  /** Query over the dispenses made at `organizationId`, or at every pharmacy; aliased `d`. */
  private dispensesAt(organizationId?: string) {
    const qb = this.dispenseRepo.createQueryBuilder('d');
    if (organizationId)
      qb.where('d.organizationId = :organizationId', { organizationId });
    return qb;
  }

  /** Dispenses `user` may list, latest first → FHIR searchset Bundle (paginated). */
  async getDispenseHistory(
    user: AuthUser,
    filter: DispenseHistoryFilter,
    pagination: PaginationQuery = {},
  ) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const { patientId, prescriptionId } = filter;
    const organizationId = dispenseScope(user, filter);
    const qb = this.dispensesAt(organizationId);
    if (patientId) qb.andWhere('d.patientId = :patientId', { patientId });
    if (prescriptionId)
      qb.andWhere('d.medicationRequestId = :prescriptionId', {
        prescriptionId,
      });
    const search = filter.search?.trim();
    if (search) {
      const searchPatientIds = parseList(filter.searchPatientIds);
      qb.andWhere(
        new Brackets((match) => {
          match
            .where('d.medicationRequestId ILIKE :prefix', {
              prefix: `${escapeLike(search)}%`,
            })
            .orWhere('d.medicationDisplay ILIKE :part', {
              part: `%${escapeLike(search)}%`,
            });
          if (searchPatientIds.length)
            match.orWhere('d.patientId IN (:...searchPatientIds)', {
              searchPatientIds,
            });
        }),
      );
    }
    const [dispenses, total] = await qb
      .orderBy('d.createdAt', 'DESC')
      .addOrderBy('d.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(dispenses.map(toFhirDispense), total, {
      page,
      pageSize,
      baseUrl: '/dispense',
      query: {
        organizationId,
        patientId,
        prescriptionId,
        search: filter.search,
        searchPatientIds: filter.searchPatientIds,
      },
    });
  }

  /**
   * The dispenses `user` may see counted: how many, what they took in, and the
   * ten medications dispensed most.
   */
  async getDispenseSummary(user: AuthUser, requestedOrganizationId?: string) {
    const organizationId = stockScope(user, requestedOrganizationId);
    const totals = await this.dispensesAt(organizationId)
      .select('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(d.totalPrice), 0)::float', 'revenue')
      .getRawOne<{ count: number; revenue: number }>();
    const topMedications = await this.dispensesAt(organizationId)
      .select('d.medicationDisplay', 'name')
      .addSelect('COALESCE(SUM(d.quantityValue), 0)::int', 'quantity')
      .groupBy('d.medicationDisplay')
      .orderBy('quantity', 'DESC')
      .addOrderBy('name', 'ASC')
      .limit(10)
      .getRawMany<{ name: string; quantity: number }>();
    return {
      count: totals?.count ?? 0,
      revenue: totals?.revenue ?? 0,
      topMedications,
    };
  }

  async getDispense(id: string) {
    const d = await this.dispenseRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException(`Dispense record ${id} not found`);
    return toFhirDispense(d);
  }

  // Stock management → FHIR searchset Bundle (paginated).
  async getStock(
    user: AuthUser,
    requestedOrganizationId?: string,
    pagination: PaginationQuery = {},
  ) {
    const organizationId = stockScope(user, requestedOrganizationId);
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const qb = this.stockRepo.createQueryBuilder('s').where('s.active = true');
    if (organizationId)
      qb.andWhere('s.organizationId = :org', { org: organizationId });
    const [stock, total] = await qb
      .orderBy('s.medicationName', 'ASC')
      .addOrderBy('s.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(stock, total, {
      page,
      pageSize,
      baseUrl: '/stock',
      query: { organizationId },
    });
  }

  /**
   * Active stock grouped by drug, each drug's batches in FEFO order. A view
   * across pharmacies has one group per drug per pharmacy: each reorders its
   * own.
   */
  async getGroupedStock(
    user: AuthUser,
    requestedOrganizationId?: string,
  ): Promise<StockGroup[]> {
    const organizationId = stockScope(user, requestedOrganizationId);
    const rows = await this.stockRepo.find({
      where: { active: true, ...(organizationId && { organizationId }) },
      order: { medicationName: 'ASC' },
    });
    const byDrug = new Map<string, Stock[]>();
    for (const s of rows) {
      const key = `${s.organizationId}|${s.medicationCode}`;
      const batches = byDrug.get(key);
      if (batches) batches.push(s);
      else byDrug.set(key, [s]);
    }

    const today = isoToday();
    return Array.from(byDrug.values(), (batches) => {
      const [first] = batches;
      const level = stockLevel(batches, today);
      return {
        organizationId: first.organizationId,
        medicationCode: first.medicationCode,
        medicationName: first.medicationName,
        genericName: first.genericName,
        form: first.form,
        strength: first.strength,
        unit: first.unit,
        ...level,
        low: isLow(level),
        batches: batches.sort(byExpiry).map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          unitPrice: b.unitPrice,
          supplier: b.supplier,
          storageLocation: b.storageLocation,
        })),
      };
    });
  }

  /** Receives a batch into the pharmacist's own pharmacy. */
  async addStock(dto: CreateStockDto, pharmacist: AuthUser): Promise<Stock> {
    const item = this.stockRepo.create({
      ...dto,
      organizationId: pharmacyOf(pharmacist),
    });
    return this.stockRepo.save(item);
  }

  /** Corrects a batch of the pharmacist's own pharmacy; another's is a 404. */
  async updateStock(
    id: string,
    dto: UpdateStockDto,
    pharmacist: AuthUser,
  ): Promise<Stock> {
    const item = await this.stockRepo.findOne({
      where: { id, organizationId: pharmacyOf(pharmacist) },
    });
    if (!item) throw new NotFoundException(`Stock item ${id} not found`);
    Object.assign(item, dto);
    return this.stockRepo.save(item);
  }

  /** The drugs that are low, one entry each, as in getGroupedStock. */
  async getLowStockAlerts(
    user: AuthUser,
    requestedOrganizationId?: string,
  ): Promise<StockGroup[]> {
    const groups = await this.getGroupedStock(user, requestedOrganizationId);
    return groups.filter((g) => g.low);
  }
}
