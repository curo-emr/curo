import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, FindOptionsWhere, Repository } from 'typeorm';
import {
  ServiceRequest,
  Observation,
  Patient,
  QrCode,
} from '@curo/shared/database';
import {
  ServiceRequestStatus,
  ObservationStatus,
  NotificationEventType,
} from '@curo/shared/enums';
import { actorId, patientScope, type AuthUser } from '@curo/shared/auth';
import { notifyPractitioner } from '@curo/shared/notifications';
import { clinicDate } from '@curo/shared/config';
import {
  escapeLike,
  parseList,
  parsePagination,
  toSearchset,
  toFhirServiceRequest,
  PaginationQuery,
} from '@curo/shared/fhir';
import {
  LAB_REPORT_DOCUMENT,
  assertActiveLab,
  labScope,
  parseLabQr,
} from '@curo/shared/lab';
import { DiagnosticReport } from '../entities/diagnostic-report.entity';
import { LabInstrument } from '../entities/lab-instrument.entity';
import { LabTestCatalog } from '../entities/lab-test-catalog.entity';
import { QCLog, QCStatus } from '../entities/qc-log.entity';
import { EnterResultsDto } from './dto/enter-results.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { DiagnosticReportStatus, InstrumentStatus } from '../enums';
import { generateLabReportPdf } from './pdf.generator';

interface LabStaffRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string | null;
  qualification: string | null;
  active: boolean;
}

function toFhirReport(r: DiagnosticReport) {
  return {
    resourceType: 'DiagnosticReport',
    id: r.id,
    status: r.status,
    code: { coding: [{ code: r.code, display: r.display }] },
    subject: { reference: `Patient/${r.patientId}` },
    performer: [{ reference: `Practitioner/${r.performerId}` }],
    basedOn: [{ reference: `ServiceRequest/${r.serviceRequestId}` }],
    effectiveDateTime: r.effectiveDateTime,
    issued: r.issued,
    conclusion: r.conclusion,
    // Pragmatic FHIR: each result carries its values inline (code, value or
    // valueString, unit, range, interpretation), which the lab portal reads.
    result: r.results ?? [],
    presentedForm: r.pdfBase64
      ? [{ contentType: 'application/pdf', data: r.pdfBase64 }]
      : [],
  };
}

/** Filters for `getOrders`; list filters are comma-separated. */
export interface OrderFilter {
  status?: string;
  priority?: string;
  encounterId?: string;
  patientId?: string;
  search?: string;
  searchPatientIds?: string;
  _sort?: string;
}

const isOrderStatus = (value: string): value is ServiceRequestStatus =>
  (Object.values(ServiceRequestStatus) as string[]).includes(value);

/** An order's priority: one given none is routine. */
const PRIORITY = `COALESCE(o.priority, 'routine')`;

/** Sorts stat (and asap) before urgent before routine. */
const PRIORITY_RANK = `CASE ${PRIORITY} WHEN 'stat' THEN 0 WHEN 'asap' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END`;

@Injectable()
export class LabService {
  constructor(
    @InjectRepository(ServiceRequest)
    private ordersRepo: Repository<ServiceRequest>,
    @InjectRepository(DiagnosticReport)
    private reportsRepo: Repository<DiagnosticReport>,
    @InjectRepository(QrCode)
    private qrRepo: Repository<QrCode>,
    @InjectRepository(Patient)
    private patientsRepo: Repository<Patient>,
    @InjectRepository(LabInstrument)
    private instrumentsRepo: Repository<LabInstrument>,
    @InjectRepository(LabTestCatalog)
    private catalogRepo: Repository<LabTestCatalog>,
    @InjectRepository(QCLog)
    private qcLogRepo: Repository<QCLog>,
    private dataSource: DataSource,
  ) {}

  // Tests a given lab offers (doctors browse before ordering).
  async getCatalog(organizationId?: string): Promise<LabTestCatalog[]> {
    const where: FindOptionsWhere<LabTestCatalog> = {
      active: true,
      ...(organizationId && { organizationId }),
    };
    return this.catalogRepo.find({ where, order: { name: 'ASC' } });
  }

  /**
   * The orders `user` may see → FHIR searchset Bundle (paginated). Filters take
   * comma-separated values. `search` matches the start of an order id, or any
   * order for `searchPatientIds` (the patients whose name matched it).
   * `_sort=priority` puts stat before urgent before routine, longest waiting
   * first within each (the lab's work order); `_sort=-authored` is newest
   * first; otherwise oldest first.
   */
  async getOrders(
    user: AuthUser,
    filter: OrderFilter = {},
    pagination: PaginationQuery = {},
  ) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const qb = this.ordersQuery(user, filter);
    // A status the enum column doesn't know would be a query error: it matches nothing.
    const status = parseList(filter.status);
    if (status.length) {
      const known = status.filter(isOrderStatus);
      qb.andWhere(known.length ? 'o.status IN (:...known)' : '1 = 0', {
        known,
      });
    }
    const priority = parseList(filter.priority);
    if (priority.length)
      qb.andWhere(`${PRIORITY} IN (:...priority)`, { priority });
    const patientIds = parseList(filter.patientId);
    if (patientIds.length)
      qb.andWhere('o.patientId IN (:...patientIds)', { patientIds });
    const search = filter.search?.trim();
    if (search) {
      const searchPatientIds = parseList(filter.searchPatientIds);
      qb.andWhere(
        new Brackets((match) => {
          match.where('o.id::text ILIKE :idPrefix', {
            idPrefix: `${escapeLike(search)}%`,
          });
          if (searchPatientIds.length)
            match.orWhere('o.patientId IN (:...searchPatientIds)', {
              searchPatientIds,
            });
        }),
      );
    }

    if (filter._sort === 'priority')
      qb.orderBy(PRIORITY_RANK, 'ASC').addOrderBy(
        'o.authoredOn',
        'ASC',
        'NULLS LAST',
      );
    else if (filter._sort === '-authored')
      qb.orderBy('o.authoredOn', 'DESC', 'NULLS LAST');
    else qb.orderBy('o.authoredOn', 'ASC', 'NULLS LAST');
    const [orders, total] = await qb
      .addOrderBy('o.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return toSearchset(orders.map(toFhirServiceRequest), total, {
      page,
      pageSize,
      baseUrl: '/orders',
      query: {
        status: filter.status,
        priority: filter.priority,
        encounterId: filter.encounterId,
        patientId: filter.patientId,
        search: filter.search,
        searchPatientIds: filter.searchPatientIds,
        _sort: filter._sort,
      },
    });
  }

  /**
   * Counts across the orders `user` may see (one visit's, given `encounterId`):
   * by FHIR status, by priority, and the ten most-ordered tests, counting each
   * test in a panel.
   */
  async getOrderSummary(
    user: AuthUser,
    filter: Pick<OrderFilter, 'encounterId'> = {},
  ) {
    const countBy = async (expression: string) => {
      const rows = await this.ordersQuery(user, filter)
        .select(expression, 'key')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy(expression)
        .getRawMany<{ key: string; count: number }>();
      return Object.fromEntries(rows.map((r) => [r.key, r.count]));
    };
    // Each test in a panel counts; an order without a panel is its own test.
    const [scoped, params] = this.ordersQuery(user, filter)
      .select('o.id')
      .getQueryAndParameters();
    const topTests: { code: string; display: string; count: number }[] =
      await this.dataSource.query(
        `SELECT t.code, MIN(t.display) AS display, COUNT(*)::int AS count
         FROM service_requests o
         CROSS JOIN LATERAL jsonb_to_recordset(
           CASE WHEN jsonb_array_length(COALESCE(o."testPanel", '[]'::jsonb)) > 0 THEN o."testPanel"
                ELSE jsonb_build_array(jsonb_build_object('code', o.code, 'display', o.display)) END
         ) AS t(code text, display text)
         WHERE o.id IN (${scoped})
         GROUP BY t.code
         ORDER BY count DESC, t.code
         LIMIT 10`,
        params,
      );

    return {
      byStatus: await countBy('o.status'),
      byPriority: await countBy(PRIORITY),
      topTests,
    };
  }

  /** `user`'s orders (their own lab's, for lab staff), narrowed to one visit when given. */
  private ordersQuery(
    user: AuthUser,
    filter: Pick<OrderFilter, 'encounterId'>,
  ) {
    const qb = this.ordersRepo.createQueryBuilder('o');
    const lab = labScope(user);
    if (lab) qb.andWhere('o.performerOrganizationId = :lab', { lab });
    if (filter.encounterId)
      qb.andWhere('o.encounterId = :encounterId', {
        encounterId: filter.encounterId,
      });
    return qb;
  }

  /** An order with the labels to print for its samples: one per test in a panel, else the order's own. */
  async getOrder(id: string, user: AuthUser) {
    const order = await this.findOrder(id, user);
    const qrs = await this.qrRepo.find({ where: { serviceRequestId: id } });
    const orderQr = qrs.find((q) => q.id === order.qrCodeId) ?? null;
    const byKey = new Map(
      qrs
        .filter((q) => q.testCode)
        .map((q) => [`${q.testCode}:${q.testIndex}`, q]),
    );
    const tests = order.testPanel?.length
      ? order.testPanel.map((t, i) => ({
          testCode: t.code,
          display: t.display,
          qrBase64: byKey.get(`${t.code}:${i}`)?.imageBase64 ?? null,
        }))
      : [
          {
            testCode: order.code,
            display: order.display,
            qrBase64: orderQr?.imageBase64 ?? null,
          },
        ];

    return {
      ...toFhirServiceRequest(order),
      qrCode: orderQr
        ? { id: orderQr.id, imageBase64: orderQr.imageBase64 }
        : null,
      tests,
    };
  }

  /**
   * Reads a scanned code. A visit slip finds the visit's tests sent to the
   * scanner's lab, and changes nothing. A sample label receives that sample,
   * but only at the lab its test was sent to: anyone else is told where it goes.
   */
  async scanQr(dto: ScanQrDto, user: AuthUser) {
    const target = parseLabQr(dto.qrData);
    if (target.kind === 'visit')
      return this.getOrders(
        user,
        { encounterId: target.encounterId },
        { pageSize: 100 },
      );

    const { orderId, testCode, testIndex } = target;
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Lab order not found for QR data`);
    const lab = labScope(user);
    if (lab && order.performerOrganizationId !== lab) {
      const name = await this.labName(order.performerOrganizationId);
      throw new ForbiddenException(
        name
          ? `This sample is for ${name}, not your lab.`
          : 'This sample is not for your lab.',
      );
    }

    // Mark the specific per-test QR (or order-level QR) as scanned.
    const performerId = actorId(user);
    const where: FindOptionsWhere<QrCode> | null =
      testCode != null
        ? { serviceRequestId: orderId, testCode }
        : order.qrCodeId
          ? { id: order.qrCodeId }
          : null;
    const qr = where ? await this.qrRepo.findOne({ where }) : null;
    if (qr && !qr.scannedAt) {
      qr.scannedAt = new Date();
      qr.scannedBy = performerId;
      await this.qrRepo.save(qr);
    }

    if (!order.receivedAt) {
      order.receivedAt = new Date();
      order.performerId = performerId;
      await this.ordersRepo.save(order);
    }

    const scannedTest =
      testCode != null
        ? {
            testCode,
            testIndex,
            display:
              (order.testPanel ?? []).find((t) => t.code === testCode)
                ?.display ?? testCode,
          }
        : null;
    return { ...toFhirServiceRequest(order), scannedTest };
  }

  async receiveOrder(id: string, user: AuthUser) {
    const order = await this.findOrder(id, user);
    order.receivedAt = new Date();
    order.performerId = actorId(user);
    const saved = await this.ordersRepo.save(order);
    return toFhirServiceRequest(saved);
  }

  /**
   * Records an order's results and completes it, in one transaction, so they
   * are saved whole or not at all. The results are the values typed in, the
   * report files uploaded for the order, or both; typed values also get a PDF
   * report. The order is claimed first: results for an order that is no longer
   * active (already reported, or revoked) get a 409, so a double submit can't
   * file two reports. The ordering practitioner is notified in the same
   * transaction.
   */
  async enterResults(dto: EnterResultsDto, performer: AuthUser) {
    const order = await this.findOrder(dto.serviceRequestId, performer);
    const typed = dto.results ?? [];
    if (!typed.length && !(await this.hasUploadedReport(order.id)))
      throw new BadRequestException(
        'Enter the results, or upload the report, first',
      );

    const performerId = actorId(performer);
    const now = new Date();
    // Compared as text: an order's patientId is not validated as a uuid.
    const patient = await this.patientsRepo
      .createQueryBuilder('p')
      .select(['p.firstName', 'p.lastName', 'p.patientCode', 'p.birthDate'])
      .where('p.id::text = :id', { id: order.patientId })
      .getOne();
    const fullName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : null;
    const patientLabel = patient
      ? `${fullName} (${patient.patientCode})`
      : `patient ${order.patientId}`;

    // Rendered before the transaction opens, so no rows stay locked meanwhile.
    const pdfBase64 = typed.length
      ? await generateLabReportPdf({
          patientName: fullName ?? 'Unknown patient',
          patientCode: patient?.patientCode ?? order.patientId,
          birthDate: patient?.birthDate ?? 'Not recorded',
          testName: order.display,
          results: typed,
          conclusion: dto.conclusion,
          labStaffName: performer.name ?? performer.email,
          clinicName:
            (await this.labName(order.performerOrganizationId)) ??
            'Curo Medical Center',
          reportDate: now.toLocaleDateString(),
        })
      : undefined;

    const report = await this.dataSource.transaction(async (em) => {
      const { affected } = await em.update(
        ServiceRequest,
        { id: order.id, status: ServiceRequestStatus.ACTIVE },
        { status: ServiceRequestStatus.COMPLETED, completedAt: now },
      );
      if (!affected)
        throw new ConflictException(`Lab order ${order.id} is not active`);

      await em.save(
        Observation,
        typed.map((r) => ({
          patientId: order.patientId,
          practitionerId: performerId,
          serviceRequestId: order.id,
          status: ObservationStatus.FINAL,
          category: 'laboratory',
          code: r.code,
          display: r.display,
          valueQuantity: r.value,
          valueUnit: r.unit,
          valueString: r.valueString,
          interpretation: r.interpretation,
          referenceRangeLow: r.referenceRangeLow,
          referenceRangeHigh: r.referenceRangeHigh,
          referenceRangeText: r.referenceRangeText,
          effectiveDateTime: now,
        })),
      );
      const report = await em.save(DiagnosticReport, {
        patientId: order.patientId,
        serviceRequestId: order.id,
        performerId,
        status: DiagnosticReportStatus.FINAL,
        code: order.code,
        display: order.display,
        results: typed,
        conclusion: dto.conclusion,
        pdfBase64,
        effectiveDateTime: now,
        issued: now,
      });

      await notifyPractitioner(em, order.requesterId, {
        eventType: NotificationEventType.LAB_RESULTS_READY,
        title: 'Lab results ready',
        message: `${order.display} results for ${patientLabel} are ready to review.`,
        relatedResourceType: 'DiagnosticReport',
        relatedResourceId: report.id,
      });
      return report;
    });

    return toFhirReport(report);
  }

  /** The reports `user` may see, by patient, visit or order → FHIR searchset Bundle (paginated). */
  async getReports(
    user: AuthUser,
    filter: {
      patientId?: string;
      encounterId?: string;
      serviceRequestId?: string;
    } = {},
    pagination: PaginationQuery = {},
  ) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const query = this.reportsQuery(user);
    if (filter.patientId) query.andWhere('r.patientId = :patientId', filter);
    if (filter.encounterId)
      query.andWhere('o.encounterId = :encounterId', filter);
    if (filter.serviceRequestId)
      query.andWhere('r.serviceRequestId = :serviceRequestId', filter);
    const [reports, total] = await query
      .orderBy('r.issued', 'DESC')
      .addOrderBy('r.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(reports.map(toFhirReport), total, {
      page,
      pageSize,
      baseUrl: '/reports',
      query: filter,
    });
  }

  async getReport(id: string, user: AuthUser) {
    const r = await this.reportsQuery(user)
      .andWhere('r.id = :id', { id })
      .getOne();
    if (!r) throw new NotFoundException(`Report ${id} not found`);
    return toFhirReport(r);
  }

  /** `user`'s view of the orders: lab staff see only their own lab's, a patient only their own. */
  private scopeOf(user: AuthUser): FindOptionsWhere<ServiceRequest> {
    const lab = labScope(user);
    const patientId = patientScope(user);
    return {
      ...(lab && { performerOrganizationId: lab }),
      ...(patientId && { patientId }),
    };
  }

  /** `user`'s view of the instruments: lab staff see only their own lab's. */
  private instrumentScopeOf(user: AuthUser): FindOptionsWhere<LabInstrument> {
    const lab = labScope(user);
    return lab ? { organizationId: lab } : {};
  }

  /** An order `user` may see; another lab's is as good as missing. */
  private async findOrder(id: string, user: AuthUser) {
    const order = await this.ordersRepo.findOne({
      where: { id, ...this.scopeOf(user) },
    });
    if (!order) throw new NotFoundException(`Lab order ${id} not found`);
    return order;
  }

  /** Reports, joined to their orders as `o`, limited to the ones `user` may see (lab staff: their lab's; a patient: their own). */
  private reportsQuery(user: AuthUser) {
    // A report's serviceRequestId is text; an order's id is a uuid.
    const query = this.reportsRepo
      .createQueryBuilder('r')
      .innerJoin(ServiceRequest, 'o', 'o.id::text = r.serviceRequestId');
    const lab = labScope(user);
    if (lab) query.andWhere('o.performerOrganizationId = :lab', { lab });
    const patientId = patientScope(user);
    if (patientId) query.andWhere('r.patientId = :own', { own: patientId });
    return query;
  }

  // organizations is owned by the auth service, so it is read with raw SQL.
  private async labName(id: string | null): Promise<string | null> {
    if (!id) return null;
    const rows = await this.dataSource.query<{ name: string }[]>(
      'SELECT name FROM organizations WHERE id::text = $1',
      [id],
    );
    return rows[0]?.name ?? null;
  }

  // Report files are kept by the document service, linked to their order.
  private async hasUploadedReport(orderId: string): Promise<boolean> {
    const rows = await this.dataSource.query<unknown[]>(
      `SELECT 1 FROM document_references
       WHERE "relatedResourceId" = $1 AND type = $2 LIMIT 1`,
      [orderId, LAB_REPORT_DOCUMENT],
    );
    return rows.length > 0;
  }

  // Instruments, like orders, belong to a lab: lab staff see and look after
  // only their own lab's, and only their QC logs.
  async getInstruments(user: AuthUser): Promise<LabInstrument[]> {
    return this.instrumentsRepo.find({ where: this.instrumentScopeOf(user) });
  }

  /** The QC logs of the instruments `user` may see, aliased `q`. */
  private qcLogsFor(user: AuthUser) {
    const query = this.qcLogRepo.createQueryBuilder('q');
    const lab = labScope(user);
    // A log's instrumentId is text; an instrument's id is a uuid.
    if (lab)
      query.where(
        `q.instrumentId IN (SELECT id::text FROM lab_instruments WHERE "organizationId" = :lab)`,
        { lab },
      );
    return query;
  }

  async getQcLogs(
    user: AuthUser,
    filters?: { instrumentId?: string; status?: QCStatus },
    pagination: PaginationQuery = {},
  ) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const query = this.qcLogsFor(user);
    if (filters?.instrumentId)
      query.andWhere('q.instrumentId = :instrumentId', {
        instrumentId: filters.instrumentId,
      });
    if (filters?.status)
      query.andWhere('q.status = :status', { status: filters.status });
    const [logs, total] = await query
      .orderBy('q.performedAt', 'DESC')
      .addOrderBy('q.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(logs, total, {
      page,
      pageSize,
      baseUrl: '/qc-logs',
      query: { ...filters },
    });
  }

  /**
   * Open QC alerts, newest first: each control (an instrument's test at one
   * level) whose latest run failed or warned. Running the control again and
   * passing clears its alert.
   */
  async getQcAlerts(user: AuthUser, pagination: PaginationQuery = {}) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const [logs, total] = await this.qcLogsFor(user)
      .andWhere('q.status != :pass', { pass: QCStatus.PASS })
      .andWhere(
        `q.id IN (
          SELECT DISTINCT ON ("instrumentId", "testCode", "controlLevel") id
          FROM lab_qc_logs
          ORDER BY "instrumentId", "testCode", "controlLevel", "performedAt" DESC, id)`,
      )
      .orderBy('q.performedAt', 'DESC')
      .addOrderBy('q.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(logs, total, {
      page,
      pageSize,
      baseUrl: '/qc-logs/alerts',
    });
  }

  /** Lab staff: a technician's own lab's, or every lab's for anyone else. */
  async getLabStaff(user: AuthUser) {
    // practitioners is owned by the auth service, so it is read with raw SQL.
    const rows = await this.dataSource.query<LabStaffRow[]>(
      `SELECT id, "firstName", "lastName", email, specialization, qualification, active
       FROM practitioners
       WHERE role = 'LAB_STAFF' AND ($1::text IS NULL OR "organizationId" = $1)
       ORDER BY "firstName", "lastName"`,
      [labScope(user) ?? null],
    );

    return rows.map((row) => ({
      id: row.id,
      name: {
        first: row.firstName,
        last: row.lastName,
        full: `${row.firstName} ${row.lastName}`,
      },
      role: 'technician',
      department: row.specialization ?? 'Laboratory',
      employeeId: row.id,
      email: row.email,
      phone: '',
      qualifications: row.qualification ? [row.qualification] : [],
      activeShift: 'morning',
      joinedAt: '',
      active: row.active,
    }));
  }

  async updateInstrumentStatus(
    id: string,
    user: AuthUser,
    status: InstrumentStatus,
    notes?: string,
  ): Promise<LabInstrument> {
    const instrument = await this.instrumentsRepo.findOne({
      where: { id, ...this.instrumentScopeOf(user) },
    });
    if (!instrument) throw new NotFoundException(`Instrument ${id} not found`);
    instrument.status = status;
    if (notes) instrument.notes = notes;
    if (status === InstrumentStatus.MAINTENANCE)
      instrument.lastMaintenanceDate = clinicDate();
    return this.instrumentsRepo.save(instrument);
  }

  /** Lab staff add instruments to their own lab; the admin names an active one. */
  async createInstrument(
    dto: CreateInstrumentDto,
    user: AuthUser,
  ): Promise<LabInstrument> {
    const lab = labScope(user);
    if (!lab) await assertActiveLab(this.dataSource, dto.organizationId);
    const instrument = this.instrumentsRepo.create({
      ...dto,
      organizationId: lab ?? dto.organizationId,
    });
    return this.instrumentsRepo.save(instrument);
  }

  // TAT calculation
  async getTatStats(user: AuthUser) {
    const completed = await this.ordersRepo.find({
      where: { status: ServiceRequestStatus.COMPLETED, ...this.scopeOf(user) },
    });
    const withTat = completed.filter((o) => o.receivedAt && o.completedAt);
    if (!withTat.length) return { averageTatMinutes: null, count: 0 };

    const tats = withTat.map(
      (o) => (o.completedAt.getTime() - o.receivedAt.getTime()) / 60000,
    );
    const avg = tats.reduce((a, b) => a + b, 0) / tats.length;
    return { averageTatMinutes: Math.round(avg), count: withTat.length, tats };
  }
}
