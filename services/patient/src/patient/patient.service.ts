import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Patient, Condition, Observation } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import { generatePatientCode, generatePhn } from '@curo/shared/identifiers';
import {
  dayBounds,
  parsePagination,
  parseUuidList,
  toSearchset,
  PaginationQuery,
} from '@curo/shared/fhir';
import { AllergyIntolerance } from '../entities/allergy-intolerance.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { CreateConditionDto } from './dto/create-condition.dto';
import {
  toFhirPatient,
  toFhirAllergy,
  toFhirCondition,
  toFhirObservation,
} from './fhir.mapper';
import type { AuthUser } from '@curo/shared/auth';

@Injectable()
export class PatientService implements OnModuleInit {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    @InjectRepository(Patient)
    private patientsRepo: Repository<Patient>,
    @InjectRepository(AllergyIntolerance)
    private allergiesRepo: Repository<AllergyIntolerance>,
    @InjectRepository(Condition)
    private conditionsRepo: Repository<Condition>,
    @InjectRepository(Observation)
    private observationsRepo: Repository<Observation>,
  ) {}

  private async generateUniquePhn(): Promise<string> {
    let phn: string;
    let exists: boolean;
    do {
      phn = generatePhn();
      exists = !!(await this.patientsRepo.findOne({
        where: { personalHealthNumber: phn },
      }));
    } while (exists);
    return phn;
  }

  /** Backfill PHNs for any patient missing one (safe on a live volume). */
  async onModuleInit(): Promise<void> {
    try {
      const missing = await this.patientsRepo
        .createQueryBuilder('p')
        .where('p.personalHealthNumber IS NULL')
        .getMany();
      if (missing.length === 0) return;
      for (const p of missing) {
        p.personalHealthNumber = await this.generateUniquePhn();
        await this.patientsRepo.save(p);
      }
      this.logger.log(
        `Backfilled PHN for ${missing.length} existing patient(s)`,
      );
    } catch (err) {
      // Table may not exist yet if migrations haven't run (npm run db:migrate).
      this.logger.warn(`PHN backfill skipped: ${(err as Error).message}`);
    }
  }

  async create(dto: CreatePatientDto) {
    // Generate unique patient code
    let patientCode: string;
    let exists: boolean;
    do {
      patientCode = generatePatientCode();
      exists = !!(await this.patientsRepo.findOne({ where: { patientCode } }));
    } while (exists);

    // Generate the Personal Health Number unless one was explicitly supplied.
    const personalHealthNumber =
      dto.personalHealthNumber || (await this.generateUniquePhn());

    const patient = this.patientsRepo.create({
      ...dto,
      patientCode,
      personalHealthNumber,
    });
    const saved = await this.patientsRepo.save(patient);
    return toFhirPatient(saved);
  }

  async findAll(
    requestingUser: Pick<AuthUser, 'role' | 'userId'>,
    search?: string,
    pagination: PaginationQuery = {},
  ) {
    if (requestingUser.role === UserRole.PATIENT) {
      throw new ForbiddenException('Patients cannot list all patients');
    }
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const { gender, _id, registeredFrom, registeredTo } = pagination as {
      gender?: string;
      _id?: string;
      registeredFrom?: string;
      registeredTo?: string;
    };
    const query = this.patientsRepo
      .createQueryBuilder('p')
      .where('p.active = true');
    if (search) {
      query.andWhere(
        '(p.firstName ILIKE :s OR p.lastName ILIKE :s OR p.patientCode ILIKE :s OR p.personalHealthNumber ILIKE :s OR p.nic ILIKE :s OR p.phone ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (gender) {
      query.andWhere('p.gender = :gender', { gender });
    }
    // Registered between two days, inclusive.
    if (registeredFrom)
      query.andWhere('p.createdAt >= :registeredFrom', {
        registeredFrom: dayBounds(registeredFrom).start,
      });
    if (registeredTo)
      query.andWhere('p.createdAt <= :registeredTo', {
        registeredTo: dayBounds(registeredTo).end,
      });
    // FHIR `_id` search: comma-separated ids — lets list screens resolve just the patients they show.
    if (_id) {
      const ids = parseUuidList(_id);
      query.andWhere(ids.length ? 'p.id IN (:...ids)' : '1 = 0', { ids });
    }
    const [patients, total] = await query
      .orderBy('p.createdAt', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    const resources = patients.map((p) =>
      toFhirPatient(p, requestingUser.role),
    );
    return toSearchset(resources, total, {
      page,
      pageSize,
      baseUrl: '/patients',
      query: { search, gender, _id },
    });
  }

  async findOne(
    id: string,
    requestingUser: Pick<AuthUser, 'role' | 'userId' | 'patientId'>,
  ) {
    const patient = await this.patientsRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);

    if (requestingUser.role === UserRole.PATIENT) {
      const userPatient = await this.patientsRepo.findOne({
        where: { userId: requestingUser.userId },
      });
      if (!userPatient || userPatient.id !== id) {
        throw new ForbiddenException('Patients can only view their own record');
      }
    }
    return toFhirPatient(patient, requestingUser.role);
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    requestingUser: Pick<AuthUser, 'role'>,
  ) {
    if (requestingUser.role === UserRole.PATIENT) {
      throw new ForbiddenException(
        'Patients cannot update records via this endpoint',
      );
    }
    const patient = await this.patientsRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    Object.assign(patient, dto);
    const saved = await this.patientsRepo.save(patient);
    return toFhirPatient(saved);
  }

  async findByCode(code: string, role?: string) {
    const patient = await this.patientsRepo.findOne({
      where: { patientCode: code },
    });
    if (!patient)
      throw new NotFoundException(`Patient with code ${code} not found`);
    return toFhirPatient(patient, role);
  }

  async findMyRecord(userId: string) {
    const patient = await this.patientsRepo.findOne({ where: { userId } });
    if (!patient)
      throw new NotFoundException('Patient record not found for this user');
    return toFhirPatient(patient);
  }

  // Allergies
  async getAllergies(patientId: string) {
    const allergies = await this.allergiesRepo.find({ where: { patientId } });
    return allergies.map(toFhirAllergy);
  }

  async getAllergiesForPatients(patientIds: string[]) {
    const allergies = await this.allergiesRepo.find({
      where: { patientId: In(patientIds) },
    });
    return allergies.map(toFhirAllergy);
  }

  async addAllergy(
    patientId: string,
    dto: CreateAllergyDto,
    practitionerId: string,
  ) {
    const patient = await this.patientsRepo.findOne({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);
    const allergy = this.allergiesRepo.create({
      ...dto,
      patientId,
      practitionerId,
    });
    const saved = await this.allergiesRepo.save(allergy);
    return toFhirAllergy(saved);
  }

  async deleteAllergy(allergyId: string): Promise<void> {
    await this.allergiesRepo.delete(allergyId);
  }

  // Conditions
  async getConditions(patientId: string) {
    const conditions = await this.conditionsRepo.find({ where: { patientId } });
    return conditions.map(toFhirCondition);
  }

  async addCondition(
    patientId: string,
    dto: CreateConditionDto,
    practitionerId: string,
  ) {
    const patient = await this.patientsRepo.findOne({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);
    const condition = this.conditionsRepo.create({
      ...dto,
      patientId,
      practitionerId,
    });
    const saved = await this.conditionsRepo.save(condition);
    return toFhirCondition(saved);
  }

  // Vitals / Observations
  async getVitals(patientId: string) {
    const obs = await this.observationsRepo.find({
      where: { patientId, category: 'vital-signs' },
      order: { effectiveDateTime: 'DESC' },
    });
    return obs.map(toFhirObservation);
  }

  async getVitalsTrend(patientId: string, code: string) {
    const obs = await this.observationsRepo.find({
      where: { patientId, category: 'vital-signs', code },
      order: { effectiveDateTime: 'ASC' },
    });
    return obs.map(toFhirObservation);
  }
}
