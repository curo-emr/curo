import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Patient } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import type { AuthUser } from '@curo/shared/auth';
import { User } from '../entities/user.entity';
import { Passwords } from '../auth/passwords';
import { AuditTrail } from '../audit/audit-trail';

/** A patient's sign-in to the patient portal, if they have one. */
export interface PortalAccess {
  login: { email: string; isActive: boolean } | null;
}

/**
 * Reception gives patients their portal sign-in and resets it when they
 * forget it. Everything is keyed by the patient, and only PATIENT logins are
 * ever looked up, so no staff account can be reached from here.
 */
@Injectable()
export class PatientAccessService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Patient)
    private patientsRepo: Repository<Patient>,
    @InjectDataSource()
    private dataSource: DataSource,
    private passwords: Passwords,
    private auditTrail: AuditTrail,
  ) {}

  async get(patientId: string): Promise<PortalAccess> {
    const login = await this.loginOf(patientId);
    return {
      login: login && { email: login.email, isActive: login.isActive },
    };
  }

  /** Creates a login that signs in with the email on the patient's record. */
  async give(patientId: string, password: string, by: AuthUser) {
    const patient = await this.patientsRepo.findOneBy({
      id: patientId,
      active: true,
    });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);
    if (!patient.email) {
      throw new BadRequestException(
        "Add the patient's email to their record first: they sign in with it",
      );
    }
    if (patient.userId || (await this.loginOf(patientId))) {
      throw new ConflictException('This patient already has portal access');
    }
    if (await this.usersRepo.existsBy({ email: patient.email })) {
      throw new ConflictException(
        `${patient.email} already signs someone else in. Put the patient's own email on their record.`,
      );
    }

    // The patient portal finds "my record" through patients.userId, and the
    // other services scope data by users.patientId: both or neither.
    const passwordHash = await this.passwords.hash(password);
    const user = await this.dataSource.transaction(async (em) => {
      const created = await em.save(
        em.create(User, {
          email: patient.email,
          passwordHash,
          role: UserRole.PATIENT,
          patientId,
        }),
      );
      await em.update(Patient, patientId, { userId: created.id });
      return created;
    });

    await this.auditTrail.record(by, {
      action: 'CREATE',
      resourceType: 'User',
      resourceId: user.id,
      patientId,
      changes: { after: { email: user.email, role: user.role } },
      outcomeDescription: 'Reception gave a patient portal access',
    });
    return { email: user.email };
  }

  async resetPassword(patientId: string, password: string, by: AuthUser) {
    const login = await this.loginOf(patientId);
    if (!login) {
      throw new NotFoundException('This patient has no portal access');
    }
    await this.passwords.reset(login, password);

    await this.auditTrail.record(by, {
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: login.id,
      patientId,
      outcomeDescription: "Reception reset a patient's portal password",
    });
    return { email: login.email };
  }

  private loginOf(patientId: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ patientId, role: UserRole.PATIENT });
  }
}
