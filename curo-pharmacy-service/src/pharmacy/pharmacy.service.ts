import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MedicationRequest } from '../entities/medication-request.entity';
import { MedicationDispense } from '../entities/medication-dispense.entity';
import { Stock } from '../entities/stock.entity';
import { DispenseMedicationDto } from './dto/dispense.dto';
import { CreateStockDto, UpdateStockDto } from './dto/stock.dto';
import { MedicationRequestStatus, MedicationDispenseStatus } from '../enums';

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
  ) {}

  // Pending prescriptions - PHARMACIST only sees name+DOB+meds, not full clinical data
  async getPendingPrescriptions(): Promise<any[]> {
    const pending = await this.medsRepo.find({
      where: { status: MedicationRequestStatus.ACTIVE },
      order: { authoredOn: 'DESC' },
    });
    return pending.map(p => ({
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
  }

  async dispense(dto: DispenseMedicationDto, pharmacistId: string): Promise<any> {
    const prescription = await this.medsRepo.findOne({ where: { id: dto.medicationRequestId } });
    if (!prescription) throw new NotFoundException(`Prescription ${dto.medicationRequestId} not found`);

    const receiptNumber = `RX-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const unitPrice = dto.unitPrice || 0;
    const qty = dto.quantityValue || prescription.quantityValue || 1;
    const totalPrice = unitPrice * qty;

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
      note: dto.note,
      whenHandedOver: new Date(),
    });
    const saved = await this.dispenseRepo.save(dispense);

    // Mark prescription as completed
    await this.medsRepo.update(dto.medicationRequestId, { status: MedicationRequestStatus.COMPLETED });

    return toFhirDispense(saved);
  }

  async getDispenseHistory(patientId?: string): Promise<any[]> {
    const where = patientId ? { patientId } : {};
    const dispenses = await this.dispenseRepo.find({ where, order: { createdAt: 'DESC' } });
    return dispenses.map(toFhirDispense);
  }

  async getDispense(id: string): Promise<any> {
    const d = await this.dispenseRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException(`Dispense record ${id} not found`);
    return toFhirDispense(d);
  }

  // Stock management
  async getStock(lowOnly?: boolean): Promise<Stock[]> {
    if (lowOnly) {
      return this.stockRepo
        .createQueryBuilder('s')
        .where('s.quantity <= s.reorderThreshold AND s.active = true')
        .getMany();
    }
    return this.stockRepo.find({ where: { active: true }, order: { medicationName: 'ASC' } });
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
