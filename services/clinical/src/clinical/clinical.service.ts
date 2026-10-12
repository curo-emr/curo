import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
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
import {
  MedicationRequestStatus,
  NotificationEventType,
  UserRole,
} from '@curo/shared/enums';
import { notifyPractitioner } from '@curo/shared/notifications';
import {
  actorId,
  patientScope,
  workplaceOf,
  type AuthUser,
} from '@curo/shared/auth';
import { AuditTrail, auditTarget, changeOf } from '@curo/shared/audit';
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

/**
 * The pharmacy whose prescriptions `user` handles, or null for everyone's. A
 * pharmacist handles those sent to their pharmacy and those from before
 * prescriptions named one; doctors and admins see every pharmacy's.
 */
const pharmacyOf = (user: AuthUser): string | null =>
  user.role === UserRole.PHARMACIST ? workplaceOf(user, 'pharmacy') : null;

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
    private auditTrail: AuditTrail,
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
  async createEncounter(dto: CreateEncounterDto, user: AuthUser) {
    const saved = await this.dataSource.transaction(async (em) => {
      const encounter = await em.save(
        Encounter,
        newEncounter(dto, actorId(user)),
      );
      if (dto.appointmentId)
        await linkTriageVitals(em, dto.appointmentId, encounter.id);
      await this.auditTrail.record(
        user,
        { action: 'CREATE', ...auditTarget('Encounter', encounter) },
        em,
      );
      return encounter;
    });
    return toFhirEncounter(saved);
  }

  /** Encounters, of one patient's when `patientId` is given. */
  async getEncounters(user: AuthUser, patientId?: string) {
    const encounters = await this.encountersRepo.find({
      where: patientId ? { patientId } : {},
      order: { createdAt: 'DESC' },
    });
    await this.auditTrail.readPatient(user, patientId, 'visits');
    return encounters.map(toFhirEncounter);
  }

  /** One visit; a patient's own only, for a patient (another's is as good as missing). */
  async getEncounter(id: string, user: AuthUser) {
    const patientId = patientScope(user);
    const e = await this.encountersRepo.findOne({
      where: { id, ...(patientId && { patientId }) },
    });
    if (!e) throw new NotFoundException(`Encounter ${id} not found`);
    await this.auditTrail.read(user, auditTarget('Encounter', e));
    return toFhirEncounter(e);
  }

  async updateEncounterStatus(
    id: string,
    status: EncounterStatus,
    user: AuthUser,
  ) {
    const e = await this.encountersRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException(`Encounter ${id} not found`);
    const changes = changeOf(e, { status });
    e.status = status;
    if (status === EncounterStatus.COMPLETED) e.periodEnd = new Date();
    const saved = await this.encountersRepo.save(e);
    await this.auditTrail.record(user, {
      action: 'UPDATE',
      ...auditTarget('Encounter', saved),
      changes,
    });
    return toFhirEncounter(saved);
  }

  // Clinical Notes
  async createNote(dto: CreateNoteDto, user: AuthUser) {
    const note = await this.notesRepo.save(
      this.notesRepo.create({ ...dto, practitionerId: actorId(user) }),
    );
    await this.auditTrail.record(user, {
      action: 'CREATE',
      ...auditTarget('ClinicalNote', note),
    });
    return note;
  }

  /** A visit's notes; a patient's own visit's only, for a patient. */
  async getEncounterNotes(encounterId: string, user: AuthUser) {
    const patientId = patientScope(user);
    const notes = await this.notesRepo.find({
      where: { encounterId, ...(patientId && { patientId }) },
    });
    await this.auditTrail.readPatient(user, notes[0]?.patientId, 'visit notes');
    return notes;
  }

  async getPatientNotes(patientId: string, user: AuthUser) {
    const notes = await this.notesRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
    await this.auditTrail.readPatient(user, patientId, 'visit notes');
    return notes;
  }

  // Vitals
  async addVitals(dto: CreateVitalsDto, user: AuthUser) {
    const saved = await this.observationsRepo.save(
      newVital(dto, actorId(user), user.role),
    );
    await this.auditTrail.record(user, {
      action: 'CREATE',
      ...auditTarget('Observation', saved),
    });
    return toFhirObservation(saved);
  }

  async getVitals(
    user: AuthUser,
    filter: { patientId?: string; appointmentId?: string },
  ) {
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
    await this.auditTrail.readPatient(
      user,
      filter.patientId ?? obs[0]?.patientId,
      'vital signs',
    );
    return obs.map(toFhirObservation);
  }

  async getVitalsTrend(patientId: string, code: string, user: AuthUser) {
    const obs = await this.observationsRepo.find({
      where: { patientId, code, category: 'vital-signs' },
      order: { effectiveDateTime: 'ASC' },
    });
    await this.auditTrail.readPatient(user, patientId, 'vital signs');
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
    user: AuthUser,
  ) {
    const where: FindOptionsWhere<Observation> = {
      patientId,
      ...(codes.length && { code: In(codes) }),
    };
    const obs = await this.observationsRepo.find({
      where,
      order: { effectiveDateTime: 'ASC' },
    });
    await this.auditTrail.readPatient(user, patientId, 'observations');
    return obs.map(toFhirObservation);
  }

  // Prescriptions
  async createPrescription(dto: CreatePrescriptionDto, user: AuthUser) {
    const saved = await this.dataSource.transaction(async (em) => {
      const [med] = await savePrescriptions(em, [dto], actorId(user));
      await this.auditTrail.record(
        user,
        { action: 'CREATE', ...auditTarget('MedicationRequest', med) },
        em,
      );
      return med;
    });
    return toFhirMedRequest(saved);
  }

  /** Prescriptions, of one patient's when `patientId` is given. */
  async getPrescriptions(user: AuthUser, patientId?: string) {
    const where = patientId ? { patientId } : {};
    const meds = await this.medsRepo.find({
      where,
      order: { authoredOn: 'DESC' },
    });
    await this.auditTrail.readPatient(user, patientId, 'prescriptions');
    return meds.map(toFhirMedRequest);
  }

  async getPrescription(id: string, user: AuthUser) {
    const med = await this.medsRepo.findOne({ where: { id } });
    if (!med) throw new NotFoundException(`Prescription ${id} not found`);
    await this.auditTrail.read(user, auditTarget('MedicationRequest', med));
    return toFhirMedRequest(med);
  }

  /** Prescriptions waiting to be dispensed. */
  getPendingPrescriptions(user: AuthUser) {
    return this.prescriptionsIn(MedicationRequestStatus.ACTIVE, user);
  }

  /** Prescriptions a pharmacy has set aside. */
  getHeldPrescriptions(user: AuthUser) {
    return this.prescriptionsIn(MedicationRequestStatus.ON_HOLD, user);
  }

  /** Prescriptions in `status` that `user` handles (see `pharmacyOf`). */
  private async prescriptionsIn(
    status: MedicationRequestStatus,
    user: AuthUser,
  ) {
    const pharmacy = pharmacyOf(user);
    const meds = await this.medsRepo.find({
      where: pharmacy
        ? [
            { status, performerOrganizationId: pharmacy },
            { status, performerOrganizationId: IsNull() },
          ]
        : { status },
      order: { authoredOn: 'DESC' },
    });
    return meds.map(toFhirMedRequest);
  }

  /**
   * Sets a waiting prescription aside until it is released, and tells the
   * doctor who wrote it why.
   */
  async holdPrescription(id: string, reason: string, pharmacist: AuthUser) {
    const statusReason = reason.trim();
    const med = await this.dataSource.transaction(async (em) => {
      const held = await this.changeStatus(
        em,
        id,
        pharmacist,
        MedicationRequestStatus.ACTIVE,
        { status: MedicationRequestStatus.ON_HOLD, statusReason },
      );
      await notifyPractitioner(em, held.practitionerId, {
        eventType: NotificationEventType.GENERAL,
        title: 'Prescription on hold',
        message: `The pharmacy put ${held.medicationDisplay} on hold: ${statusReason}`,
        relatedResourceType: 'MedicationRequest',
        relatedResourceId: held.id,
      });
      return held;
    });
    return toFhirMedRequest(med);
  }

  /** Returns a held prescription to the ones waiting to be dispensed. */
  async releasePrescription(id: string, pharmacist: AuthUser) {
    const med = await this.dataSource.transaction((em) =>
      this.changeStatus(em, id, pharmacist, MedicationRequestStatus.ON_HOLD, {
        status: MedicationRequestStatus.ACTIVE,
        statusReason: null,
      }),
    );
    return toFhirMedRequest(med);
  }

  /**
   * Moves a prescription of the pharmacist's own pharmacy (or one that names
   * none) out of `from`, only if it is still in it, so a dispense or another
   * hold racing this one can't be overwritten. Audited in `em`'s transaction.
   */
  private async changeStatus(
    em: EntityManager,
    id: string,
    pharmacist: AuthUser,
    from: MedicationRequestStatus,
    change: Pick<MedicationRequest, 'status' | 'statusReason'>,
  ) {
    const repo = em.getRepository(MedicationRequest);
    const pharmacy = workplaceOf(pharmacist, 'pharmacy');
    const sentTo = await repo.findOne({
      where: { id },
      select: { id: true, performerOrganizationId: true },
    });
    if (!sentTo) throw new NotFoundException(`Prescription ${id} not found`);
    if (
      sentTo.performerOrganizationId &&
      sentTo.performerOrganizationId !== pharmacy
    )
      throw new ForbiddenException(
        'This prescription was sent to another pharmacy',
      );
    const { affected } = await repo.update({ id, status: from }, change);
    const med = await repo.findOneByOrFail({ id });
    if (!affected)
      throw new ConflictException(`This prescription is ${med.status}`);
    await this.auditTrail.record(
      pharmacist,
      {
        action: 'UPDATE',
        ...auditTarget('MedicationRequest', med),
        changes: { before: { status: from }, after: change },
      },
      em,
    );
    return med;
  }

  /** One summary per patient; patients with no prescriptions are left out. */
  /** Each patient's waiting prescriptions that `user` handles (see `pharmacyOf`), and when they were last prescribed anything. */
  async getPrescriptionSummaries(
    patientIds: string[],
    user: AuthUser,
  ): Promise<PrescriptionSummary[]> {
    const pharmacy = pharmacyOf(user);
    const waiting = pharmacy
      ? 'm.status = :active AND (m.performerOrganizationId = :pharmacy OR m.performerOrganizationId IS NULL)'
      : 'm.status = :active';
    const rows = await this.medsRepo
      .createQueryBuilder('m')
      .select('m.patientId', 'patientId')
      .addSelect(`COUNT(*) FILTER (WHERE ${waiting})`, 'pendingCount')
      .addSelect('MAX(m.authoredOn)', 'lastPrescribedAt')
      .where('m.patientId IN (:...patientIds)', { patientIds })
      .setParameters({ active: MedicationRequestStatus.ACTIVE, pharmacy })
      .groupBy('m.patientId')
      .getRawMany<{
        patientId: string;
        pendingCount: string; // COUNT arrives as a string (bigint)
        lastPrescribedAt: Date | null;
      }>();
    return rows.map((r) => ({ ...r, pendingCount: Number(r.pendingCount) }));
  }

  // Lab Orders
  async createLabOrder(dto: CreateLabOrderDto, user: AuthUser) {
    const { order, qr } = await this.dataSource.transaction(async (em) => {
      const saved = await saveLabOrder(em, dto, actorId(user));
      await this.auditTrail.record(
        user,
        { action: 'CREATE', ...auditTarget('ServiceRequest', saved.order) },
        em,
      );
      return saved;
    });
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

  /** Lab orders, of one patient's when `patientId` is given. */
  async getLabOrders(user: AuthUser, patientId?: string) {
    const where = patientId ? { patientId } : {};
    const orders = await this.labOrdersRepo.find({
      where,
      order: { authoredOn: 'DESC' },
    });
    await this.auditTrail.readPatient(user, patientId, 'lab orders');
    return orders.map(toFhirServiceRequest);
  }

  /** One lab order; a patient's own only, for a patient (another's is as good as missing). */
  async getLabOrder(id: string, user: AuthUser) {
    const patientId = patientScope(user);
    const order = await this.labOrdersRepo.findOne({
      where: { id, ...(patientId && { patientId }) },
    });
    if (!order) throw new NotFoundException(`Lab order ${id} not found`);
    await this.auditTrail.read(user, auditTarget('ServiceRequest', order));
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
  async createTask(dto: CreateTaskDto, user: AuthUser): Promise<Task> {
    const task = await this.tasksRepo.save(
      this.tasksRepo.create({
        ...dto,
        ownerId: actorId(user),
        authoredOn: new Date(),
      }),
    );
    await this.auditTrail.record(user, {
      action: 'CREATE',
      ...auditTarget('Task', task),
    });
    return task;
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

  async updateTask(
    id: string,
    update: UpdateTaskDto,
    user: AuthUser,
  ): Promise<Task> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    const changes = changeOf(task, update);
    Object.assign(task, update, { lastModified: new Date() });
    const saved = await this.tasksRepo.save(task);
    await this.auditTrail.record(user, {
      action: 'UPDATE',
      ...auditTarget('Task', saved),
      changes,
    });
    return saved;
  }
}
