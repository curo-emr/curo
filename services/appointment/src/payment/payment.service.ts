import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { AuditLog } from '@curo/shared/database';
import {
  parsePagination,
  toSearchset,
  PaginationQuery,
} from '@curo/shared/fhir';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import type { AuthUser } from '@curo/shared/auth';

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
    const collectedBy = user.practitionerId || user.userId;

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

  /** A receptionist's own collected payments. `collectedBy` always comes from the JWT. */
  async findMine(
    user: AuthUser,
    from?: string,
    to?: string,
    pagination: PaginationQuery = {},
  ): Promise<any> {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const collectedBy = user.practitionerId || user.userId;
    const range = this.dateRange(from, to);
    const [payments, total] = await this.paymentsRepo.findAndCount({
      where: { collectedBy, ...(range ? { paidAt: range } : {}) },
      order: { paidAt: 'DESC' },
      skip,
      take,
    });
    return toSearchset(payments, total, {
      page,
      pageSize,
      baseUrl: '/payments/mine',
      query: { from, to },
    });
  }

  /** Own income summary bucketed by day/week/month, plus the grand total. */
  async summary(
    user: AuthUser,
    period: 'day' | 'week' | 'month',
    from?: string,
    to?: string,
  ) {
    const collectedBy = user.practitionerId || user.userId;
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

    const rows = await qb.getRawMany();
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
  ): Promise<any> {
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
