import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsWhere,
  Repository,
  In,
  IsNull,
  Not,
} from 'typeorm';
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
import { MedicationRequestStatus, UserRole } from '@curo/shared/enums';
import { workplaceOf, type AuthUser } from '@curo/shared/auth';
import {
  parsePagination,
  toSearchset,
  toFhirServiceRequest,
  SearchQuery,
} from '@curo/shared/fhir';
import { labSampleUrl, labVisitUrl } from '@curo/shared/lab';
import { Task } from '../entities/task.entity';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { EncounterStatus, TaskStatus } from '../enums';
import { Icd10Code } from '../entities/icd10-code.entity';
import {
  toFhirEncounter,
  toFhirMedRequest,
  toFhirObservation,
} from './fhir.mapper';
import {
  linkTriageVitals,
  newEncounter,
  savePrescriptions,
  newVital,
  saveLabOrder,
} from './clinical-records';

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

/** A patient's prescriptions at a glance, for a patient list row. */
export interface PrescriptionSummary {
  patientId: string;
  /** Active prescriptions, i.e. awaiting dispense. */
  pendingCount: number;
  lastPrescribedAt: Date | null;
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
    private dataSource: DataSource,
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
  async createEncounter(dto: CreateEncounterDto, practitionerId: string) {
    const saved = await this.dataSource.transaction(async (em) => {
      const encounter = await em.save(
        Encounter,
        newEncounter(dto, practitionerId),
      );
      if (dto.appointmentId)
        await linkTriageVitals(em, dto.appointmentId, encounter.id);
      return encounter;
    });
    return toFhirEncounter(saved);
  }

  async getPatientEncounters(patientId: string) {
    const encounters = await this.encountersRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
    return encounters.map(toFhirEncounter);
  }

  // List encounters, optionally filtered by patient (GET /encounters?patientId=)
  async getEncounters(patientId?: string) {
    const encounters = await this.encountersRepo.find({
      where: patientId ? { patientId } : {},
      order: { createdAt: 'DESC' },
    });
    return encounters.map(toFhirEncounter);
  }

  async getEncounter(id: string) {
    const e = await this.encountersRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException(`Encounter ${id} not found`);
    return toFhirEncounter(e);
  }

  async updateEncounterStatus(id: string, status: EncounterStatus) {
    const e = await this.encountersRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException(`Encounter ${id} not found`);
    e.status = status;
    if (status === EncounterStatus.COMPLETED) e.periodEnd = new Date();
    const saved = await this.encountersRepo.save(e);
    return toFhirEncounter(saved);
  }

  // Clinical Notes
  async createNote(dto: CreateNoteDto, practitionerId: string) {
    const note = this.notesRepo.create({ ...dto, practitionerId });
    return this.notesRepo.save(note);
  }

  async getEncounterNotes(encounterId: string) {
    return this.notesRepo.find({ where: { encounterId } });
  }

  async getPatientNotes(patientId: string) {
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
  ) {
    const saved = await this.observationsRepo.save(
      newVital(dto, practitionerId, performerRole),
    );
    return toFhirObservation(saved);
  }

  async getVitals(filter: { patientId?: string; appointmentId?: string }) {
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

  async getVitalsTrend(patientId: string, code: string) {
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
  async getObservationsTrend(patientId: string, codes: string[]) {
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
  async createPrescription(dto: CreatePrescriptionDto, practitionerId: string) {
    const [saved] = await savePrescriptions(
      this.medsRepo.manager,
      [dto],
      practitionerId,
    );
    return toFhirMedRequest(saved);
  }

  async getPatientPrescriptions(patientId: string) {
    const meds = await this.medsRepo.find({
      where: { patientId },
      order: { authoredOn: 'DESC' },
    });
    return meds.map(toFhirMedRequest);
  }

  async getPrescriptions(patientId?: string) {
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

  /**
   * Prescriptions waiting to be dispensed: for a pharmacist, those sent to
   * their pharmacy and those from before prescriptions named one; for anyone
   * else, every pharmacy's.
   */
  async getPendingPrescriptions(user: AuthUser) {
    const status = MedicationRequestStatus.ACTIVE;
    const meds = await this.medsRepo.find({
      where:
        user.role === UserRole.PHARMACIST
          ? [
              {
                status,
                performerOrganizationId: workplaceOf(user, 'pharmacy'),
              },
              { status, performerOrganizationId: IsNull() },
            ]
          : { status },
      order: { authoredOn: 'DESC' },
    });
    return meds.map(toFhirMedRequest);
  }

  /** One summary per patient; patients with no prescriptions are left out. */
  async getPrescriptionSummaries(
    patientIds: string[],
  ): Promise<PrescriptionSummary[]> {
    const rows = await this.medsRepo
      .createQueryBuilder('m')
      .select('m.patientId', 'patientId')
      .addSelect('COUNT(*) FILTER (WHERE m.status = :active)', 'pendingCount')
      .addSelect('MAX(m.authoredOn)', 'lastPrescribedAt')
      .where('m.patientId IN (:...patientIds)', { patientIds })
      .setParameter('active', MedicationRequestStatus.ACTIVE)
      .groupBy('m.patientId')
      .getRawMany<{
        patientId: string;
        pendingCount: string; // COUNT arrives as a string (bigint)
        lastPrescribedAt: Date | null;
      }>();
    return rows.map((r) => ({ ...r, pendingCount: Number(r.pendingCount) }));
  }

  // Lab Orders
  async createLabOrder(dto: CreateLabOrderDto, practitionerId: string) {
    const { order, qr } = await this.dataSource.transaction((em) =>
      saveLabOrder(em, dto, practitionerId),
    );
    return {
      ...toFhirServiceRequest(order),
      qrCode: { id: qr.id, imageBase64: qr.imageBase64 },
      tests: await this.getTestQrs(order.id, order.testPanel ?? []),
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
        const testUrl = labSampleUrl(orderId, { code: t.code, index: i });
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

  async getLabOrders(patientId?: string) {
    const where = patientId ? { patientId } : {};
    const orders = await this.labOrdersRepo.find({
      where,
      order: { authoredOn: 'DESC' },
    });
    return orders.map(toFhirServiceRequest);
  }

  async getLabOrder(id: string) {
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

  /** The QR on a visit's lab slip, which every lab scans to find the tests sent to it. */
  async getLabSlip(encounterId: string) {
    const encodedUrl = labVisitUrl(encounterId);
    return { encodedUrl, qrBase64: await QRCode.toDataURL(encodedUrl) };
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
