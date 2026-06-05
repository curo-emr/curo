import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import * as QRCode from 'qrcode';
import { Encounter } from '../entities/encounter.entity';
import { ClinicalNote } from '../entities/clinical-note.entity';
import { MedicationRequest } from '../entities/medication-request.entity';
import { ServiceRequest } from '../entities/service-request.entity';
import { Observation } from '../entities/observation.entity';
import { QrCode } from '../entities/qr-code.entity';
import { Task } from '../entities/task.entity';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { EncounterStatus, MedicationRequestStatus, ServiceRequestStatus, ObservationStatus } from '../enums';

function toFhirEncounter(e: Encounter) {
  return {
    resourceType: 'Encounter',
    id: e.id,
    status: e.status,
    class: { code: e.classCode || 'AMB', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
    subject: { reference: `Patient/${e.patientId}` },
    participant: [{ individual: { reference: `Practitioner/${e.practitionerId}` } }],
    appointment: e.appointmentId ? [{ reference: `Appointment/${e.appointmentId}` }] : undefined,
    period: { start: e.periodStart, end: e.periodEnd },
    reasonCode: e.reasonCode ? [{ text: e.reasonCode }] : undefined,
    meta: { lastUpdated: e.updatedAt },
  };
}

function toFhirMedRequest(m: MedicationRequest) {
  return {
    resourceType: 'MedicationRequest',
    id: m.id,
    status: m.status,
    intent: m.intent || 'order',
    medicationCodeableConcept: { coding: [{ code: m.medicationCode, display: m.medicationDisplay }] },
    subject: { reference: `Patient/${m.patientId}` },
    requester: { reference: `Practitioner/${m.practitionerId}` },
    encounter: m.encounterId ? { reference: `Encounter/${m.encounterId}` } : undefined,
    authoredOn: m.authoredOn,
    dosageInstruction: [{
      text: m.dosageText,
      route: m.route ? { text: m.route } : undefined,
      timing: m.frequency ? { code: { text: m.frequency } } : undefined,
      doseAndRate: m.quantityValue ? [{ doseQuantity: { value: m.quantityValue, unit: m.quantityUnit } }] : undefined,
    }],
    dispenseRequest: { quantity: { value: m.quantityValue, unit: m.quantityUnit }, expectedSupplyDuration: m.durationDays ? { value: m.durationDays, unit: 'days' } : undefined },
    note: m.note ? [{ text: m.note }] : undefined,
  };
}

function toFhirServiceRequest(s: ServiceRequest) {
  return {
    resourceType: 'ServiceRequest',
    id: s.id,
    status: s.status,
    intent: s.intent || 'order',
    category: s.category ? [{ coding: [{ code: s.category }] }] : undefined,
    code: { coding: [{ code: s.code, display: s.display }] },
    subject: { reference: `Patient/${s.patientId}` },
    requester: { reference: `Practitioner/${s.requesterId}` },
    encounter: s.encounterId ? { reference: `Encounter/${s.encounterId}` } : undefined,
    authoredOn: s.authoredOn,
    priority: s.priority,
    note: s.note ? [{ text: s.note }] : undefined,
    extension: [
      s.qrCodeId && { url: 'urn:curo:qrCodeId', valueString: s.qrCodeId },
    ].filter(Boolean),
    testPanel: s.testPanel,
  };
}

function toFhirObservation(o: Observation) {
  return {
    resourceType: 'Observation',
    id: o.id,
    status: o.status,
    category: o.category ? [{ coding: [{ code: o.category }] }] : undefined,
    code: { coding: [{ code: o.code, display: o.display }] },
    subject: { reference: `Patient/${o.patientId}` },
    performer: [{ reference: `Practitioner/${o.practitionerId}` }],
    encounter: o.encounterId ? { reference: `Encounter/${o.encounterId}` } : undefined,
    effectiveDateTime: o.effectiveDateTime,
    valueQuantity: o.valueQuantity != null ? { value: Number(o.valueQuantity), unit: o.valueUnit } : undefined,
    valueString: o.valueString,
    component: o.components,
  };
}

@Injectable()
export class ClinicalService {
  constructor(
    @InjectRepository(Encounter)
    private encountersRepo: Repository<Encounter>,
    @InjectRepository(ClinicalNote)
    private notesRepo: Repository<ClinicalNote>,
    @InjectRepository(MedicationRequest)
    private medsRepo: Repository<MedicationRequest>,
    @InjectRepository(ServiceRequest)
    private labOrdersRepo: Repository<ServiceRequest>,
    @InjectRepository(Observation)
    private observationsRepo: Repository<Observation>,
    @InjectRepository(QrCode)
    private qrCodesRepo: Repository<QrCode>,
    @InjectRepository(Task)
    private tasksRepo: Repository<Task>,
  ) {}

  // Encounters
  async createEncounter(dto: CreateEncounterDto, practitionerId: string): Promise<any> {
    const encounter = this.encountersRepo.create({
      ...dto,
      practitionerId,
      status: EncounterStatus.IN_PROGRESS,
      periodStart: dto.periodStart ? new Date(dto.periodStart) : new Date(),
    });
    const saved = await this.encountersRepo.save(encounter);
    return toFhirEncounter(saved);
  }

  async getPatientEncounters(patientId: string): Promise<any[]> {
    const encounters = await this.encountersRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
    return encounters.map(toFhirEncounter);
  }

  // List encounters, optionally filtered by patient (GET /encounters?patientId=)
  async getEncounters(patientId?: string): Promise<any[]> {
    const encounters = await this.encountersRepo.find({
      where: patientId ? { patientId } : {},
      order: { createdAt: 'DESC' },
    });
    return encounters.map(toFhirEncounter);
  }

  async getEncounter(id: string): Promise<any> {
    const e = await this.encountersRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException(`Encounter ${id} not found`);
    return toFhirEncounter(e);
  }

  async updateEncounterStatus(id: string, status: EncounterStatus): Promise<any> {
    const e = await this.encountersRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException(`Encounter ${id} not found`);
    e.status = status;
    if (status === EncounterStatus.COMPLETED) e.periodEnd = new Date();
    const saved = await this.encountersRepo.save(e);
    return toFhirEncounter(saved);
  }

  // Clinical Notes
  async createNote(dto: CreateNoteDto, practitionerId: string): Promise<any> {
    const note = this.notesRepo.create({ ...dto, practitionerId });
    return this.notesRepo.save(note);
  }

  async getEncounterNotes(encounterId: string): Promise<any[]> {
    return this.notesRepo.find({ where: { encounterId } });
  }

  async getPatientNotes(patientId: string): Promise<any[]> {
    return this.notesRepo.find({ where: { patientId }, order: { createdAt: 'DESC' } });
  }

  // Vitals
  async addVitals(dto: CreateVitalsDto, practitionerId: string): Promise<any> {
    const obs = this.observationsRepo.create({
      ...dto,
      practitionerId,
      category: 'vital-signs',
      status: ObservationStatus.FINAL,
      effectiveDateTime: dto.effectiveDateTime ? new Date(dto.effectiveDateTime) : new Date(),
    });
    const saved = await this.observationsRepo.save(obs);
    return toFhirObservation(saved);
  }

  async getVitals(patientId: string): Promise<any[]> {
    const obs = await this.observationsRepo.find({
      where: { patientId, category: 'vital-signs' },
      order: { effectiveDateTime: 'DESC' },
    });
    return obs.map(toFhirObservation);
  }

  async getVitalsTrend(patientId: string, code: string): Promise<any[]> {
    const obs = await this.observationsRepo.find({
      where: { patientId, code, category: 'vital-signs' },
      order: { effectiveDateTime: 'ASC' },
    });
    return obs.map(toFhirObservation);
  }

  // Prescriptions
  async createPrescription(dto: CreatePrescriptionDto, practitionerId: string): Promise<any> {
    const med = this.medsRepo.create({
      ...dto,
      practitionerId,
      status: MedicationRequestStatus.ACTIVE,
      intent: 'order',
      authoredOn: new Date(),
    });
    const saved = await this.medsRepo.save(med);
    return toFhirMedRequest(saved);
  }

  async getPatientPrescriptions(patientId: string): Promise<any[]> {
    const meds = await this.medsRepo.find({
      where: { patientId },
      order: { authoredOn: 'DESC' },
    });
    return meds.map(toFhirMedRequest);
  }

  async getPendingPrescriptions(): Promise<any[]> {
    const meds = await this.medsRepo.find({
      where: { status: MedicationRequestStatus.ACTIVE },
      order: { authoredOn: 'DESC' },
    });
    return meds.map(toFhirMedRequest);
  }

  // Lab Orders
  async createLabOrder(dto: CreateLabOrderDto, practitionerId: string): Promise<any> {
    const order = this.labOrdersRepo.create({
      ...dto,
      requesterId: practitionerId,
      status: ServiceRequestStatus.ACTIVE,
      category: 'laboratory',
      authoredOn: new Date(),
    });
    const savedOrder = await this.labOrdersRepo.save(order);

    // Generate QR code
    const qrUrl = `${process.env.GATEWAY_URL || 'http://localhost:3000'}/lab/orders/${savedOrder.id}`;
    const imageBase64 = await QRCode.toDataURL(qrUrl);
    const qrCode = this.qrCodesRepo.create({
      serviceRequestId: savedOrder.id,
      encodedUrl: qrUrl,
      imageBase64,
    });
    const savedQr = await this.qrCodesRepo.save(qrCode);
    await this.labOrdersRepo.update(savedOrder.id, { qrCodeId: savedQr.id });

    const finalOrder = await this.labOrdersRepo.findOne({ where: { id: savedOrder.id } });
    return { ...toFhirServiceRequest(finalOrder!), qrCode: { id: savedQr.id, imageBase64 } };
  }

  async getLabOrders(patientId?: string): Promise<any[]> {
    const where = patientId ? { patientId } : {};
    const orders = await this.labOrdersRepo.find({ where, order: { authoredOn: 'DESC' } });
    return orders.map(toFhirServiceRequest);
  }

  async getLabOrder(id: string): Promise<any> {
    const order = await this.labOrdersRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Lab order ${id} not found`);
    const qr = order.qrCodeId ? await this.qrCodesRepo.findOne({ where: { id: order.qrCodeId } }) : null;
    return { ...toFhirServiceRequest(order), qrCode: qr ? { id: qr.id, imageBase64: qr.imageBase64 } : null };
  }

  // Tasks
  async createTask(dto: any, ownerId: string): Promise<any> {
    const task = this.tasksRepo.create({ ...dto, ownerId, authoredOn: new Date() });
    return this.tasksRepo.save(task);
  }

  async getDoctorTasks(ownerId: string): Promise<any[]> {
    return this.tasksRepo.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
  }

  // List the current user's tasks (GET /tasks?status=). status=open => non-terminal statuses.
  async getTasks(ownerId: string, status?: string): Promise<any[]> {
    const where: any = { ownerId };
    if (status === 'open') {
      where.status = Not(In(['completed', 'cancelled', 'failed']));
    } else if (status) {
      where.status = status;
    }
    return this.tasksRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async updateTask(id: string, update: any): Promise<any> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    Object.assign(task, update, { lastModified: new Date() });
    return this.tasksRepo.save(task);
  }
}
