import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { AuditLog } from '@curo/shared/database';
import {
  parseList,
  parsePagination,
  toSearchset,
  PaginationQuery,
} from '@curo/shared/fhir';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { actorId, type AuthUser } from '@curo/shared/auth';

const CURRENCY = process.env.CURRENCY || 'LKR';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepo: Repository<Payment>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  private genReceipt(): string {
    return `RCP-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  /** Receptionist records the amount collected for a patient visit. Immutable afterwards. */
  async create(dto: CreatePaymentDto, user: AuthUser): Promise<Payment> {
    const collectedBy = actorId(user);

    // One consultation payment per appointment — prevents double entry / silent edits.
    if (dto.appointmentId) {
      const existing = await this.paymentsRepo.findOne({
        where: { appointmentId: dto.appointmentId },
      });
      if (existing) {
        throw new ConflictException(
          'A payment has already been recorded for this visit',
        );
      }
    }

    const payment = this.paymentsRepo.create({
      patientId: dto.patientId,
      appointmentId: dto.appointmentId,
      encounterId: dto.encounterId,
      collectedBy,
      type: dto.type || 'consultation',
      amount: dto.amount,
      currency: CURRENCY,
      paymentMethod: dto.paymentMethod || 'cash',
      status: 'paid',
      receiptNumber: this.genReceipt(),
      notes: dto.notes,
      paidAt: new Date(),
    });
    const saved = await this.paymentsRepo.save(payment);

    await this.auditRepo.save(
      this.auditRepo.create({
        userId: user.userId,
        userRole: user.role,
        action: 'CREATE',
        resourceType: 'Payment',
        resourceId: saved.id,
        patientId: saved.patientId,
        changes: {
          after: {
            amount: saved.amount,
            currency: saved.currency,
            receiptNumber: saved.receiptNumber,
          },
        },
        outcome: 'success',
        outcomeDescription: 'Receptionist recorded a visit payment',
      }),
    );

    return saved;
  }

  private dateRange(from?: string, to?: string) {
    if (!from && !to) return undefined;
    const start = from ? new Date(from) : new Date('1970-01-01');
    const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date('2999-12-31');
    return Between(start, end);
  }

  /**
   * A receptionist's own collected payments, latest first: those for
   * `appointmentId` (a comma-separated list) when given. `collectedBy` always
   * comes from the JWT.
   */
  async findMine(
    user: AuthUser,
    filters: { from?: string; to?: string; appointmentId?: string },
    pagination: PaginationQuery = {},
  ) {
    const { from, to } = filters;
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const collectedBy = actorId(user);
    const range = this.dateRange(from, to);
    const appointmentIds = parseList(filters.appointmentId);
    const [payments, total] = await this.paymentsRepo.findAndCount({
      where: {
        collectedBy,
        ...(range ? { paidAt: range } : {}),
        ...(appointmentIds.length ? { appointmentId: In(appointmentIds) } : {}),
      },
      order: { paidAt: 'DESC', id: 'ASC' },
      skip,
      take,
    });
    return toSearchset(payments, total, {
      page,
      pageSize,
      baseUrl: '/payments/mine',
      query: { ...filters },
    });
  }

  /** Own income summary bucketed by day/week/month, plus the grand total. */
  async summary(
    user: AuthUser,
    period: 'day' | 'week' | 'month',
    from?: string,
    to?: string,
  ) {
    const collectedBy = actorId(user);
    const unit = ['day', 'week', 'month'].includes(period) ? period : 'day';

    const qb = this.paymentsRepo
      .createQueryBuilder('p')
      .select(`date_trunc('${unit}', p."paidAt")`, 'bucket')
      .addSelect('SUM(p.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('p.collectedBy = :collectedBy', { collectedBy })
      .andWhere(`p.status = 'paid'`);

    if (from) qb.andWhere('p."paidAt" >= :from', { from: new Date(from) });
    if (to)
      qb.andWhere('p."paidAt" <= :to', { to: new Date(`${to}T23:59:59.999Z`) });

    qb.groupBy('bucket').orderBy('bucket', 'ASC');

    // pg returns SUM/COUNT as strings.
    const rows = await qb.getRawMany<{
      bucket: Date;
      total: string;
      count: string;
    }>();
    const buckets = rows.map((r) => ({
      bucket: r.bucket,
      total: Number(r.total),
      count: Number(r.count),
    }));
    const total = buckets.reduce((s, b) => s + b.total, 0);
    const count = buckets.reduce((s, b) => s + b.count, 0);
    return { currency: CURRENCY, period: unit, total, count, buckets };
  }

  // ── Admin oversight ──────────────────────────────────────────────────────
  async findAllForAdmin(
    filters: {
      collectedBy?: string;
      patientId?: string;
      from?: string;
      to?: string;
    },
    pagination: PaginationQuery = {},
  ) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const qb = this.paymentsRepo.createQueryBuilder('p');
    if (filters.collectedBy)
      qb.andWhere('p.collectedBy = :c', { c: filters.collectedBy });
    if (filters.patientId)
      qb.andWhere('p.patientId = :pid', { pid: filters.patientId });
    if (filters.from)
      qb.andWhere('p."paidAt" >= :from', { from: new Date(filters.from) });
    if (filters.to)
      qb.andWhere('p."paidAt" <= :to', {
        to: new Date(`${filters.to}T23:59:59.999Z`),
      });
    const [payments, total] = await qb
      .orderBy('p.paidAt', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(payments, total, {
      page,
      pageSize,
      baseUrl: '/payments',
      query: { ...filters },
    });
  }

  /**
   * What payments of every status add up to, overall and per receptionist
   * (largest first); only `collectedBy`'s, when given.
   */
  async totalsForAdmin(collectedBy?: string) {
    const qb = this.paymentsRepo
      .createQueryBuilder('p')
      .select('p.collectedBy', 'collectedBy')
      .addSelect('COALESCE(SUM(p.amount), 0)::float', 'total')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('p.collectedBy')
      .orderBy('total', 'DESC');
    if (collectedBy) qb.where('p.collectedBy = :collectedBy', { collectedBy });
    const byCollector = await qb.getRawMany<{
      collectedBy: string | null;
      total: number;
      count: number;
    }>();
    return {
      currency: CURRENCY,
      total: byCollector.reduce((sum, c) => sum + c.total, 0),
      count: byCollector.reduce((sum, c) => sum + c.count, 0),
      byCollector,
    };
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  /** SUPER_ADMIN-only correction. Records a before/after audit entry. */
  async adminUpdate(
    id: string,
    dto: UpdatePaymentDto,
    user: AuthUser,
  ): Promise<Payment> {
    const payment = await this.findOne(id);
    const before = {
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      notes: payment.notes,
    };

    if (dto.amount != null) payment.amount = dto.amount;
    if (dto.paymentMethod != null) payment.paymentMethod = dto.paymentMethod;
    if (dto.status != null) payment.status = dto.status;
    if (dto.notes != null) payment.notes = dto.notes;

    const saved = await this.paymentsRepo.save(payment);

    await this.auditRepo.save(
      this.auditRepo.create({
        userId: user.userId,
        userRole: user.role,
        action: 'UPDATE',
        resourceType: 'Payment',
        resourceId: id,
        patientId: payment.patientId,
        changes: {
          before,
          after: {
            amount: saved.amount,
            paymentMethod: saved.paymentMethod,
            status: saved.status,
            notes: saved.notes,
          },
        },
        outcome: 'success',
        outcomeDescription: 'Admin corrected a recorded payment',
      }),
    );

    return saved;
  }
}
