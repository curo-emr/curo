import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
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
import {
  AllergyUpdateDto,
  CreateAllergyDto,
  UpdateAllergyDto,
} from './dto/create-allergy.dto';
import { allergyColumns, isCurrentAllergy } from './allergy-records';
import { CreateConditionDto } from './dto/create-condition.dto';
import {
  toFhirPatient,
  toFhirAllergy,
  toFhirCondition,
  toFhirObservation,
} from './fhir.mapper';
import { actorId, type AuthUser } from '@curo/shared/auth';

// Who may change or retire an allergy once recorded; anyone who records them may add one.
const ALLERGY_EDITORS = new Set<string>([
  UserRole.DOCTOR,
  UserRole.SUPER_ADMIN,
]);

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
    private dataSource: DataSource,
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

  /** Registers a patient, with any allergies recorded by `recorderId`, in one transaction. */
  async create(dto: CreatePatientDto, recorderId: string) {
    const { allergies = [], ...fields } = dto;
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

    return this.dataSource.transaction(async (em) => {
      const saved = await em.save(
        em.create(Patient, { ...fields, patientCode, personalHealthNumber }),
      );
      await this.addAllergies(em, saved.id, allergies, recorderId);
      return toFhirPatient(saved);
    });
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

  /** Updates the patient and their allergies together: a failed allergy change saves nothing. */
  async update(
    id: string,
    dto: UpdatePatientDto,
    requestingUser: Pick<AuthUser, 'role' | 'userId' | 'practitionerId'>,
  ) {
    if (requestingUser.role === UserRole.PATIENT) {
      throw new ForbiddenException(
        'Patients cannot update records via this endpoint',
      );
    }
    const { newAllergies = [], allergyUpdates = [], ...fields } = dto;
    if (allergyUpdates.length && !ALLERGY_EDITORS.has(requestingUser.role)) {
      throw new ForbiddenException(
        'Only doctors can change or retire a recorded allergy',
      );
    }

    return this.dataSource.transaction(async (em) => {
      const patient = await em.findOne(Patient, { where: { id } });
      if (!patient) throw new NotFoundException(`Patient ${id} not found`);
      Object.assign(patient, fields);
      const saved = await em.save(patient);
      await this.addAllergies(em, id, newAllergies, actorId(requestingUser));
      await this.changeAllergies(em, id, allergyUpdates);
      return toFhirPatient(saved);
    });
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

  // Allergies: the patient's current ones; retired ones stay on record but aren't listed.
  async getAllergies(patientId: string) {
    const allergies = await this.allergiesRepo.find({ where: { patientId } });
    return allergies.filter(isCurrentAllergy).map(toFhirAllergy);
  }

  async getAllergiesForPatients(patientIds: string[]) {
    const allergies = await this.allergiesRepo.find({
      where: { patientId: In(patientIds) },
    });
    return allergies.filter(isCurrentAllergy).map(toFhirAllergy);
  }

  async addAllergy(
    patientId: string,
    dto: CreateAllergyDto,
    recorderId: string,
  ) {
    return this.dataSource.transaction(async (em) => {
      if (!(await em.exists(Patient, { where: { id: patientId } }))) {
        throw new NotFoundException(`Patient ${patientId} not found`);
      }
      const [saved] = await this.addAllergies(em, patientId, [dto], recorderId);
      return toFhirAllergy(saved);
    });
  }

  /** Changes one recorded allergy; clinicalStatus "inactive" retires it. */
  async updateAllergy(
    patientId: string,
    allergyId: string,
    dto: UpdateAllergyDto,
  ) {
    return this.dataSource.transaction(async (em) => {
      const [saved] = await this.changeAllergies(em, patientId, [
        { ...dto, id: allergyId },
      ]);
      return toFhirAllergy(saved);
    });
  }

  private addAllergies(
    em: EntityManager,
    patientId: string,
    dtos: CreateAllergyDto[],
    recorderId: string,
  ) {
    return em.save(
      dtos.map((dto) =>
        em.create(AllergyIntolerance, {
          clinicalStatus: 'active',
          ...allergyColumns(dto),
          patientId,
          practitionerId: recorderId,
        }),
      ),
    );
  }

  /**
   * Applies changes to the patient's allergies, keeping who recorded them. One
   * that isn't this patient's is a 404, which undoes the whole transaction.
   */
  private async changeAllergies(
    em: EntityManager,
    patientId: string,
    updates: AllergyUpdateDto[],
  ) {
    if (!updates.length) return [];
    const recorded = await em.find(AllergyIntolerance, {
      where: { patientId, id: In(updates.map((u) => u.id)) },
    });
    return em.save(
      updates.map((update) => {
        const allergy = recorded.find((a) => a.id === update.id);
        if (!allergy) {
          throw new NotFoundException(
            `Allergy ${update.id} not found for patient ${patientId}`,
          );
        }
        return Object.assign(allergy, allergyColumns(update, allergy));
      }),
    );
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
