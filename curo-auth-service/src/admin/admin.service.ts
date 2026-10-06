import {
  Injectable, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Practitioner } from '../entities/practitioner.entity';
import { Patient } from '../entities/patient.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Gender, UserRole } from '../enums';
import { parsePagination, toSearchset, PaginationQuery } from '../common/fhir-bundle';

type AuthUser = { userId: string; role: string };

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Practitioner)
    private practitionersRepo: Repository<Practitioner>,
    @InjectRepository(Patient)
    private patientsRepo: Repository<Patient>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  private async audit(entry: Partial<AuditLog>) {
    await this.auditRepo.save(this.auditRepo.create({ outcome: 'success', ...entry }));
  }

  async createUser(dto: CreateUserDto, requestingUser: AuthUser) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    let practitionerId: string | undefined;

    if (dto.role !== UserRole.PATIENT) {
      const practitioner = await this.practitionersRepo.save(this.practitionersRepo.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        gender: (dto.gender as Gender) || Gender.UNKNOWN,
        role: dto.role,
        specialization: dto.specialization,
        qualification: dto.qualification,
        licenseNumber: dto.licenseNumber,
        organizationId: dto.organizationId,
      }));
      practitionerId = practitioner.id;
    }

    const user = await this.usersRepo.save(this.usersRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      practitionerId,
      patientId: dto.role === UserRole.PATIENT ? dto.patientId : undefined,
    }));

    if (practitionerId) {
      await this.practitionersRepo.update(practitionerId, { userId: user.id });
    }

    await this.audit({
      userId: requestingUser.userId,
      userRole: requestingUser.role,
      action: 'CREATE',
      resourceType: 'User',
      resourceId: user.id,
      patientId: user.patientId,
      changes: { after: { email: dto.email, role: dto.role, name: `${dto.firstName} ${dto.lastName}` } },
      outcomeDescription: 'Admin created a user account',
    });

    return { id: user.id, email: user.email, role: user.role, practitionerId, patientId: user.patientId };
  }

  /** Resolve a display name for a user from its practitioner or patient record. */
  private async listWithNames(users: User[]) {
    const pracIds = users.map((u) => u.practitionerId).filter(Boolean) as string[];
    const patIds = users.map((u) => u.patientId).filter(Boolean) as string[];
    const pracs = pracIds.length ? await this.practitionersRepo.find({ where: { id: In(pracIds) } }) : [];
    const pats = patIds.length ? await this.patientsRepo.find({ where: { id: In(patIds) } }) : [];
    const pracMap = new Map(pracs.map((p) => [p.id, p]));
    const patMap = new Map(pats.map((p) => [p.id, p]));

    return users.map((u) => {
      const prac = u.practitionerId ? pracMap.get(u.practitionerId) : undefined;
      const pat = u.patientId ? patMap.get(u.patientId) : undefined;
      const name = prac
        ? `${prac.firstName} ${prac.lastName}`
        : pat
          ? `${pat.firstName} ${pat.lastName}`
          : u.email;
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        practitionerId: u.practitionerId ?? null,
        patientId: u.patientId ?? null,
        name,
        specialization: prac?.specialization ?? null,
        phone: prac?.phone ?? null,
        organizationId: prac?.organizationId ?? null,
        createdAt: u.createdAt,
      };
    });
  }

  async listUsers(filters: { search?: string; role?: string }, pagination: PaginationQuery = {}) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const qb = this.usersRepo.createQueryBuilder('u');
    if (filters.role) qb.andWhere('u.role = :role', { role: filters.role });

    // Names live on practitioner/patient. Pre-resolve matching ids there, then
    // filter the (single-table) user query by id — pushing search into SQL so we
    // paginate the matching set, not the whole table.
    if (filters.search) {
      const s = `%${filters.search}%`;
      const [pracs, pats] = await Promise.all([
        this.practitionersRepo.createQueryBuilder('p').select('p.id', 'id')
          .where('p.firstName ILIKE :s OR p.lastName ILIKE :s', { s }).getRawMany(),
        this.patientsRepo.createQueryBuilder('p').select('p.id', 'id')
          .where('p.firstName ILIKE :s OR p.lastName ILIKE :s', { s }).getRawMany(),
      ]);
      const pracIds = pracs.map((r) => r.id);
      const patIds = pats.map((r) => r.id);
      qb.andWhere(
        '(u.email ILIKE :s OR u.role::text ILIKE :s' +
          (pracIds.length ? ' OR u.practitionerId IN (:...pracIds)' : '') +
          (patIds.length ? ' OR u.patientId IN (:...patIds)' : '') +
          ')',
        { s, pracIds, patIds },
      );
    }

    const [users, total] = await qb
      .orderBy('u.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    const rows = await this.listWithNames(users);
    return toSearchset(rows, total, {
      page,
      pageSize,
      baseUrl: '/admin/users',
      query: { ...filters },
    });
  }

  async getUser(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const [row] = await this.listWithNames([user]);
    return row;
  }

  async updateUser(id: string, dto: UpdateUserDto, requestingUser: AuthUser) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    const before: Record<string, unknown> = { isActive: user.isActive };
    if (dto.isActive != null) {
      user.isActive = dto.isActive;
      await this.usersRepo.save(user);
    }

    if (user.practitionerId) {
      const prac = await this.practitionersRepo.findOne({ where: { id: user.practitionerId } });
      if (prac) {
        before['firstName'] = prac.firstName;
        before['lastName'] = prac.lastName;
        if (dto.firstName != null) prac.firstName = dto.firstName;
        if (dto.lastName != null) prac.lastName = dto.lastName;
        if (dto.phone != null) prac.phone = dto.phone;
        if (dto.specialization != null) prac.specialization = dto.specialization;
        if (dto.qualification != null) prac.qualification = dto.qualification;
        if (dto.licenseNumber != null) prac.licenseNumber = dto.licenseNumber;
        if (dto.organizationId != null) prac.organizationId = dto.organizationId;
        await this.practitionersRepo.save(prac);
      }
    }

    await this.audit({
      userId: requestingUser.userId,
      userRole: requestingUser.role,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: id,
      changes: { before, after: dto as Record<string, unknown> },
      outcomeDescription: 'Admin updated a user account',
    });

    return this.getUser(id);
  }

  async resetPassword(id: string, newPassword: string, requestingUser: AuthUser) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepo.save(user);

    await this.audit({
      userId: requestingUser.userId,
      userRole: requestingUser.role,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: id,
      outcomeDescription: 'Admin reset a user password',
    });

    return { id, success: true };
  }
}
