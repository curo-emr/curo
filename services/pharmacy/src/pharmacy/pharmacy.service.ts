import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MedicationRequest } from '@curo/shared/database';
import { MedicationRequestStatus } from '@curo/shared/enums';
import { parsePagination, toSearchset, PaginationQuery } from '@curo/shared/fhir';
import { MedicationDispense } from '../entities/medication-dispense.entity';
import { Stock } from '../entities/stock.entity';
import { MedicationCatalog } from '../entities/medication-catalog.entity';
import { DispenseMedicationDto } from './dto/dispense.dto';
import { CreateStockDto, UpdateStockDto } from './dto/stock.dto';
import { MedicationDispenseStatus } from '../enums';

function toFhirDispense(d: MedicationDispense) {
  return {
    resourceType: 'MedicationDispense',
    id: d.id,
    status: d.status,
    medicationCodeableConcept: { coding: [{ code: d.medicationCode, display: d.medicationDisplay }] },
    subject: { reference: `Patient/${d.patientId}` },
    authorizingPrescription: [{ reference: `MedicationRequest/${d.medicationRequestId}` }],
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
  async getMedicationCatalog(query: PaginationQuery & { search?: string } = {}) {
    const { skip, take, page, pageSize } = parsePagination(query);
    const qb = this.catalogRepo.createQueryBuilder('m').where('m.active = true');
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

  // Pending prescriptions - PHARMACIST only sees name+DOB+meds, not full clinical data
  async getPendingPrescriptions(pagination: PaginationQuery = {}): Promise<any> {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const [pending, total] = await this.medsRepo.findAndCount({
      where: { status: MedicationRequestStatus.ACTIVE },
      order: { authoredOn: 'DESC' },
      skip,
      take,
    });
    const resources = pending.map(p => ({
      id: p.id,
      patientId: p.patientId,
      medicationCode: p.medicationCode,
      medicationDisplay: p.medicationDisplay,
      dosageText: p.dosageText,
      route: p.route,
      frequency: p.frequency,
      quantityValue: p.quantityValue,
      quantityUnit: p.quantityUnit,
      authoredOn: p.authoredOn,
      note: p.note,
    }));
    return toSearchset(resources, total, { page, pageSize, baseUrl: '/prescriptions/pending' });
  }

  /**
   * Decrement stock for a drug using FEFO (First-Expiry-First-Out): consume the
   * earliest-expiring non-expired batches first, across multiple rows if needed.
   * Best-effort — if no matching stock exists, dispensing still proceeds (returns []).
   * Returns the batch numbers drawn from.
   */
  private async decrementStockFEFO(medicationCode: string, qty: number): Promise<string[]> {
    const today = new Date().toISOString().slice(0, 10);
    const batches = await this.stockRepo
      .createQueryBuilder('s')
      .where('s.medicationCode = :code AND s.active = true AND s.quantity > 0', { code: medicationCode })
      .andWhere('(s.expiryDate IS NULL OR s.expiryDate >= :today)', { today })
      .orderBy('s.expiryDate', 'ASC', 'NULLS LAST')
      .getMany();

    let remaining = qty;
    const used: string[] = [];
    for (const b of batches) {
      if (remaining <= 0) break;
      const take = Math.min(b.quantity, remaining);
      b.quantity -= take;
      remaining -= take;
      await this.stockRepo.save(b);
      if (b.batchNumber) used.push(`${b.batchNumber}×${take}`);
    }
    return used;
  }

  async dispense(dto: DispenseMedicationDto, pharmacistId: string): Promise<any> {
    const prescription = await this.medsRepo.findOne({ where: { id: dto.medicationRequestId } });
    if (!prescription) throw new NotFoundException(`Prescription ${dto.medicationRequestId} not found`);

    const receiptNumber = `RX-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const unitPrice = dto.unitPrice || 0;
    const qty = dto.quantityValue || prescription.quantityValue || 1;
    const totalPrice = unitPrice * qty;

    // FEFO stock decrement (best-effort) — record which batch(es) were used.
    const usedBatches = await this.decrementStockFEFO(prescription.medicationCode, qty);

    const dispense = this.dispenseRepo.create({
      medicationRequestId: dto.medicationRequestId,
      patientId: dto.patientId,
      pharmacistId,
      status: MedicationDispenseStatus.COMPLETED,
      medicationCode: prescription.medicationCode,
      medicationDisplay: prescription.medicationDisplay,
      quantityValue: qty,
      quantityUnit: dto.quantityUnit || prescription.quantityUnit,
      dosageText: prescription.dosageText,
      dispenserName: dto.dispenserName,
      unitPrice,
      totalPrice,
      receiptNumber,
      batchNumber: usedBatches.length ? usedBatches.join(', ') : undefined,
      note: dto.note,
      whenHandedOver: new Date(),
    });
    const saved = await this.dispenseRepo.save(dispense);

    // Mark prescription as completed
    await this.medsRepo.update(dto.medicationRequestId, { status: MedicationRequestStatus.COMPLETED });

    return toFhirDispense(saved);
  }

  async getDispenseHistory(patientId?: string, pagination: PaginationQuery = {}): Promise<any> {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const where = patientId ? { patientId } : {};
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
      query: { patientId },
    });
  }

  async getDispense(id: string): Promise<any> {
    const d = await this.dispenseRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException(`Dispense record ${id} not found`);
    return toFhirDispense(d);
  }

  // Stock management → FHIR searchset Bundle (paginated).
  async getStock(lowOnly?: boolean, organizationId?: string, pagination: PaginationQuery = {}): Promise<any> {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const qb = this.stockRepo.createQueryBuilder('s').where('s.active = true');
    if (lowOnly) qb.andWhere('s.quantity <= s.reorderThreshold');
    if (organizationId) qb.andWhere('s.organizationId = :org', { org: organizationId });
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
  async getGroupedStock(): Promise<any[]> {
    const rows = await this.stockRepo.find({ where: { active: true }, order: { medicationName: 'ASC' } });
    const groups = new Map<string, any>();
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
    // sort each drug's batches earliest-expiry first (FEFO)
    const result = Array.from(groups.values());
    for (const g of result) {
      g.batches.sort((a: any, b: any) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
    }
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
