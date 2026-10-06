import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '@curo/shared/database';
import { parsePagination, toSearchset, PaginationQuery } from '@curo/shared/fhir';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(data: {
    userId: string;
    userRole?: string;
    action: string;
    resourceType: string;
    resourceId: string;
    patientId?: string;
    ipAddress?: string;
    userAgent?: string;
    changes?: Record<string, unknown>;
    outcome?: string;
    outcomeDescription?: string;
  }): Promise<AuditLog> {
    const log = this.auditRepo.create(data);
    return this.auditRepo.save(log);
  }

  async findAll(requestingUser: { role: string }, filters?: {
    userId?: string;
    resourceType?: string;
    patientId?: string;
    from?: string;
    to?: string;
  }, pagination: PaginationQuery = {}): Promise<any> {
    if (requestingUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admin can view audit logs');
    }

    const { page, pageSize, skip, take } = parsePagination(pagination);
    const query = this.auditRepo.createQueryBuilder('a');
    if (filters?.userId) query.andWhere('a.userId = :uid', { uid: filters.userId });
    if (filters?.resourceType) query.andWhere('a.resourceType = :rt', { rt: filters.resourceType });
    if (filters?.patientId) query.andWhere('a.patientId = :pid', { pid: filters.patientId });
    if (filters?.from) query.andWhere('a.createdAt >= :from', { from: new Date(filters.from) });
    if (filters?.to) query.andWhere('a.createdAt <= :to', { to: new Date(filters.to) });

    const [logs, total] = await query
      .orderBy('a.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(logs, total, {
      page,
      pageSize,
      baseUrl: '/audit',
      query: { ...filters },
    });
  }
}
