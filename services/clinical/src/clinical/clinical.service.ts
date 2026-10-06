import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, In, Not, IsNull } from 'typeorm';
import * as QRCode from 'qrcode';
import { Encounter } from '../entities/encounter.entity';
import { ClinicalNote } from '../entities/clinical-note.entity';
import {
  MedicationRequest,
  ServiceRequest,
  Observation,
  QrCode,
  type LabPanelTest,
} from '@curo/shared/database';
import {
  MedicationRequestStatus,
  ServiceRequestStatus,
  ObservationStatus,
} from '@curo/shared/enums';
import { parsePagination, toSearchset, SearchQuery } from '@curo/shared/fhir';
import { Task } from '../entities/task.entity';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { EncounterStatus, TaskStatus } from '../enums';
import { Icd10Code } from '../entities/icd10-code.entity';

const CLOSED_TASK_STATUSES = [
  TaskStatus.COMPLETED,
  TaskStatus.CANCELLED,
  TaskStatus.FAILED,
];

function isTaskStatus(value: string): value is TaskStatus {
  return (Object.values(TaskStatus) as string[]).includes(value);
}

/** A test in a lab order with the QR label printed for its sample. */
export interface LabTestQr {
  testCode: string;
  display: string;
  qrBase64: string;
  qrId: string;
}

function toFhirEncounter(e: Encounter) {
  return {
    resourceType: 'Encounter',
    id: e.id,
    status: e.status,
    class: {
      code: e.classCode || 'AMB',
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    },
    subject: { reference: `Patient/${e.patientId}` },
    participant: [
      { individual: { reference: `Practitioner/${e.practitionerId}` } },
    ],
    appointment: e.appointmentId
      ? [{ reference: `Appointment/${e.appointmentId}` }]
      : undefined,
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
    medicationCodeableConcept: {
      coding: [{ code: m.medicationCode, display: m.medicationDisplay }],
    },
    subject: { reference: `Patient/${m.patientId}` },
    requester: { reference: `Practitioner/${m.practitionerId}` },
    encounter: m.encounterId
      ? { reference: `Encounter/${m.encounterId}` }
      : undefined,
    authoredOn: m.authoredOn,
    dosageInstruction: [
      {
        text: m.dosageText,
        route: m.route ? { text: m.route } : undefined,
        timing: m.frequency ? { code: { text: m.frequency } } : undefined,
        doseAndRate: m.quantityValue
          ? [{ doseQuantity: { value: m.quantityValue, unit: m.quantityUnit } }]
          : undefined,
      },
    ],
    dispenseRequest: {
      quantity: { value: m.quantityValue, unit: m.quantityUnit },
      expectedSupplyDuration: m.durationDays
        ? { value: m.durationDays, unit: 'days' }
        : undefined,
    },
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
    encounter: s.encounterId
      ? { reference: `Encounter/${s.encounterId}` }
      : undefined,
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
    encounter: o.encounterId
      ? { reference: `Encounter/${o.encounterId}` }
      : undefined,
    effectiveDateTime: o.effectiveDateTime,
    valueQuantity:
      o.valueQuantity != null
        ? { value: Number(o.valueQuantity), unit: o.valueUnit }
        : undefined,
    valueString: o.valueString,
    component: o.components,
    extension: [
      o.appointmentId && {
        url: 'urn:curo:appointmentId',
        valueString: o.appointmentId,
      },
      o.performerRole && {
        url: 'urn:curo:performerRole',
        valueString: o.performerRole,
      },
    ].filter(Boolean),
  };
}

@Injectable()
export class ClinicalService implements OnModuleInit {
  private readonly logger = new Logger(ClinicalService.name);

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
    @InjectRepository(Icd10Code)
    private icd10Repo: Repository<Icd10Code>,
  ) {}

  // ICD-10 diagnosis catalog (DB-backed) — searchable + paginated FHIR searchset.
  async getIcd10(query: SearchQuery = {}) {
    const { skip, take, page, pageSize } = parsePagination(query);
    const qb = this.icd10Repo.createQueryBuilder('c');
    if (query.search) {
      qb.where(
        '(c.code ILIKE :s OR c.name ILIKE :s OR c.keywords::text ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    const [rows, total] = await qb
      .orderBy('c.code', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(rows, total, {
      page,
      pageSize,
      baseUrl: '/icd10',
      query: { search: query.search },
    });
  }

  /** Backfill per-test QR codes for any existing lab orders that lack them. */
  async onModuleInit(): Promise<void> {
    try {
      const orders = await this.labOrdersRepo.find();
      let count = 0;
      for (const o of orders) {
        const panel = o.testPanel ?? [];
        if (panel.length === 0) continue;
        const existing = await this.qrCodesRepo.count({
          where: { serviceRequestId: o.id },
        });
        // order-level QR is 1; if we don't yet have one-per-test, generate them
        if (existing < panel.length + 1) {
          await this.getTestQrs(o.id, panel);
          count++;
        }
      }
      if (count)
        this.logger.log(
          `Backfilled per-test QR codes for ${count} lab order(s)`,
        );
    } catch (err) {
      this.logger.warn(
        `Per-test QR backfill skipped: ${(err as Error).message}`,
      );
    }
  }

  // Encounters
  async createEncounter(
    dto: CreateEncounterDto,
    practitionerId: string,
  ): Promise<any> {
    const encounter = this.encountersRepo.create({
      ...dto,
      practitionerId,
      status: EncounterStatus.IN_PROGRESS,
      periodStart: dto.periodStart ? new Date(dto.periodStart) : new Date(),
    });
    const saved = await this.encountersRepo.save(encounter);
    if (dto.appointmentId) {
      // Pull the visit's triage vitals (recorded before the encounter existed) into it.
      await this.observationsRepo.update(
        { appointmentId: dto.appointmentId, encounterId: IsNull() },
        { encounterId: saved.id },
      );
    }
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

  async updateEncounterStatus(
    id: string,
    status: EncounterStatus,
  ): Promise<any> {
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
    return this.notesRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }

  // Vitals
  async addVitals(
    dto: CreateVitalsDto,
    practitionerId: string,
    performerRole: string,
  ): Promise<any> {
    const obs = this.observationsRepo.create({
      ...dto,
      practitionerId,
      performerRole,
      category: 'vital-signs',
      status: ObservationStatus.FINAL,
      effectiveDateTime: dto.effectiveDateTime
        ? new Date(dto.effectiveDateTime)
        : new Date(),
    });
    const saved = await this.observationsRepo.save(obs);
    return toFhirObservation(saved);
  }

  async getVitals(filter: {
    patientId?: string;
    appointmentId?: string;
  }): Promise<any[]> {
    if (!filter.patientId && !filter.appointmentId) {
      throw new BadRequestException('patientId or appointmentId is required');
    }
    const where: FindOptionsWhere<Observation> = {
      category: 'vital-signs',
      ...(filter.patientId && { patientId: filter.patientId }),
      ...(filter.appointmentId && { appointmentId: filter.appointmentId }),
    };
    const obs = await this.observationsRepo.find({
      where,
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

  /**
   * Category-agnostic trend for one or more LOINC codes. Unlike getVitalsTrend
   * this does NOT filter by category, so it also returns lab-sourced values
   * (e.g. glucose, cholesterol) for charting alongside vitals like blood pressure.
   */
  async getObservationsTrend(
    patientId: string,
    codes: string[],
  ): Promise<any[]> {
    const where: FindOptionsWhere<Observation> = {
      patientId,
      ...(codes.length && { code: In(codes) }),
    };
    const obs = await this.observationsRepo.find({
      where,
      order: { effectiveDateTime: 'ASC' },
    });
    return obs.map(toFhirObservation);
  }

  // Prescriptions
  async createPrescription(
    dto: CreatePrescriptionDto,
    practitionerId: string,
  ): Promise<any> {
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

  async getPrescriptions(patientId?: string): Promise<any[]> {
    const where = patientId ? { patientId } : {};
    const meds = await this.medsRepo.find({
      where,
      order: { authoredOn: 'DESC' },
    });
    return meds.map(toFhirMedRequest);
  }

  async getPrescription(id: string) {
    const med = await this.medsRepo.findOne({ where: { id } });
    if (!med) throw new NotFoundException(`Prescription ${id} not found`);
    return toFhirMedRequest(med);
  }

  async getPendingPrescriptions(): Promise<any[]> {
    const meds = await this.medsRepo.find({
      where: { status: MedicationRequestStatus.ACTIVE },
      order: { authoredOn: 'DESC' },
    });
    return meds.map(toFhirMedRequest);
  }

  // Lab Orders
  async createLabOrder(
    dto: CreateLabOrderDto,
    practitionerId: string,
  ): Promise<any> {
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

    const finalOrder = await this.labOrdersRepo.findOne({
      where: { id: savedOrder.id },
    });
    return {
      ...toFhirServiceRequest(finalOrder!),
      qrCode: { id: savedQr.id, imageBase64 },
      tests: await this.getTestQrs(savedOrder.id, savedOrder.testPanel ?? []),
    };
  }

  /**
   * One QR per test in the panel — labs print these and stick them on each sample.
   * Generates and persists any that are missing (new orders, and older/seeded
   * orders that only had an order-level QR).
   */
  private async getTestQrs(
    orderId: string,
    testPanel: LabPanelTest[],
  ): Promise<LabTestQr[]> {
    const qrs = await this.qrCodesRepo.find({
      where: { serviceRequestId: orderId },
    });
    const byCode = new Map(
      qrs
        .filter((q) => q.testCode)
        .map((q) => [`${q.testCode}:${q.testIndex}`, q]),
    );
    const out: LabTestQr[] = [];
    for (let i = 0; i < testPanel.length; i++) {
      const t = testPanel[i];
      let qr = byCode.get(`${t.code}:${i}`);
      if (!qr) {
        const testUrl = `${process.env.GATEWAY_URL || 'http://localhost:3000'}/lab/orders/${orderId}?test=${encodeURIComponent(t.code)}&i=${i}`;
        qr = await this.qrCodesRepo.save(
          this.qrCodesRepo.create({
            serviceRequestId: orderId,
            testCode: t.code,
            testIndex: i,
            encodedUrl: testUrl,
            imageBase64: await QRCode.toDataURL(testUrl),
          }),
        );
      }
      out.push({
        testCode: t.code,
        display: t.display,
        qrBase64: qr.imageBase64,
        qrId: qr.id,
      });
    }
    return out;
  }

  async getLabOrders(patientId?: string): Promise<any[]> {
    const where = patientId ? { patientId } : {};
    const orders = await this.labOrdersRepo.find({
      where,
      order: { authoredOn: 'DESC' },
    });
    return orders.map(toFhirServiceRequest);
  }

  async getLabOrder(id: string): Promise<any> {
    const order = await this.labOrdersRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Lab order ${id} not found`);
    const qr = order.qrCodeId
      ? await this.qrCodesRepo.findOne({ where: { id: order.qrCodeId } })
      : null;
    return {
      ...toFhirServiceRequest(order),
      qrCode: qr ? { id: qr.id, imageBase64: qr.imageBase64 } : null,
      tests: await this.getTestQrs(order.id, order.testPanel ?? []),
    };
  }

  // Tasks
  async createTask(dto: CreateTaskDto, ownerId: string): Promise<Task> {
    const task = this.tasksRepo.create({
      ...dto,
      ownerId,
      authoredOn: new Date(),
    });
    return this.tasksRepo.save(task);
  }

  async getDoctorTasks(ownerId: string): Promise<Task[]> {
    return this.tasksRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  // List the current user's tasks (GET /tasks?status=). status=open => non-terminal statuses.
  async getTasks(ownerId: string, status?: string): Promise<Task[]> {
    const where: FindOptionsWhere<Task> = { ownerId };
    if (status === 'open') {
      where.status = Not(In(CLOSED_TASK_STATUSES));
    } else if (status) {
      if (!isTaskStatus(status)) {
        throw new BadRequestException(`Unknown task status: ${status}`);
      }
      where.status = status;
    }
    return this.tasksRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async updateTask(id: string, update: UpdateTaskDto): Promise<Task> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    Object.assign(task, update, { lastModified: new Date() });
    return this.tasksRepo.save(task);
  }
}
