import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  QueryFailedError,
  Repository,
} from 'typeorm';
import {
  Patient,
  Condition,
  Observation,
  UNIQUE_NIC,
} from '@curo/shared/database';
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
import { workplacePatients } from './workplace-patients';
import { CreateConditionDto } from './dto/create-condition.dto';
import {
  toFhirPatient,
  toFhirAllergy,
  toFhirCondition,
  toFhirObservation,
} from './fhir.mapper';
import { actorId, type AuthUser } from '@curo/shared/auth';
import { AuditTrail, auditTarget, changeOf } from '@curo/shared/audit';

// Who may change or retire an allergy once recorded; anyone who records them may add one.
const ALLERGY_EDITORS = new Set<string>([
  UserRole.DOCTOR,
  UserRole.SUPER_ADMIN,
]);

/** Whether a save failed because another patient already has the NIC. */
const isNicTaken = (err: unknown) =>
  err instanceof QueryFailedError &&
  (err.driverError as { constraint?: string }).constraint === UNIQUE_NIC;

/** A patient as an audit target: the record is the patient's own. */
const patientRecord = (p: Patient) =>
  auditTarget('Patient', { id: p.id, patientId: p.id });

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
    private auditTrail: AuditTrail,
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

  /** Registers a patient, with any allergies `recorder` took down, in one transaction. */
  async create(dto: CreatePatientDto, recorder: AuthUser) {
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

    return this.withUniqueNic(dto.nic, () =>
      this.dataSource.transaction(async (em) => {
        const saved = await em.save(
          em.create(Patient, { ...fields, patientCode, personalHealthNumber }),
        );
        await this.auditTrail.record(
          recorder,
          { action: 'CREATE', ...patientRecord(saved) },
          em,
        );
        await this.addAllergies(em, saved.id, allergies, recorder);
        return toFhirPatient(saved);
      }),
    );
  }

  /**
   * Runs a save of a patient with `nic`, turning a clash with another
   * patient's NIC into a 409 that names them, so reception can find the record.
   */
  private async withUniqueNic<T>(
    nic: string | null | undefined,
    save: () => Promise<T>,
  ): Promise<T> {
    try {
      return await save();
    } catch (err) {
      if (!nic || !isNicTaken(err)) throw err;
      const holder = await this.patientsRepo.findOneBy({ nic });
      throw new ConflictException(
        `NIC ${nic} is already registered to patient ${holder?.patientCode ?? 'on file'}`,
      );
    }
  }

  async findAll(
    requestingUser: AuthUser,
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
    const workplace = workplacePatients(requestingUser);
    if (workplace) query.andWhere(workplace.where, workplace.params);
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

  async findOne(id: string, requestingUser: AuthUser) {
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
    await this.auditTrail.read(requestingUser, patientRecord(patient));
    return toFhirPatient(patient, requestingUser.role);
  }

  /** Updates the patient and their allergies together: a failed allergy change saves nothing. */
  async update(id: string, dto: UpdatePatientDto, requestingUser: AuthUser) {
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

    return this.withUniqueNic(fields.nic, () =>
      this.dataSource.transaction(async (em) => {
        const patient = await em.findOne(Patient, { where: { id } });
        if (!patient) throw new NotFoundException(`Patient ${id} not found`);
        const changes = changeOf(patient, fields);
        Object.assign(patient, fields);
        const saved = await em.save(patient);
        await this.auditTrail.record(
          requestingUser,
          { action: 'UPDATE', ...patientRecord(saved), changes },
          em,
        );
        await this.addAllergies(em, id, newAllergies, requestingUser);
        await this.changeAllergies(em, id, allergyUpdates, requestingUser);
        return toFhirPatient(saved);
      }),
    );
  }

  async findByCode(code: string, user: AuthUser) {
    const patient = await this.patientsRepo.findOne({
      where: { patientCode: code },
    });
    if (!patient)
      throw new NotFoundException(`Patient with code ${code} not found`);
    await this.auditTrail.read(user, patientRecord(patient));
    return toFhirPatient(patient, user.role);
  }

  async findMyRecord(user: AuthUser) {
    const patient = await this.patientsRepo.findOne({
      where: { userId: user.userId },
    });
    if (!patient)
      throw new NotFoundException('Patient record not found for this user');
    await this.auditTrail.read(user, patientRecord(patient));
    return toFhirPatient(patient);
  }

  // Allergies: the patient's current ones; retired ones stay on record but aren't listed.
  async getAllergies(patientId: string, user: AuthUser) {
    const allergies = await this.allergiesRepo.find({ where: { patientId } });
    await this.auditTrail.readPatient(user, patientId, 'allergies');
    return allergies.filter(isCurrentAllergy).map(toFhirAllergy);
  }

  async getAllergiesForPatients(patientIds: string[]) {
    const allergies = await this.allergiesRepo.find({
      where: { patientId: In(patientIds) },
    });
    return allergies.filter(isCurrentAllergy).map(toFhirAllergy);
  }

  async addAllergy(patientId: string, dto: CreateAllergyDto, user: AuthUser) {
    return this.dataSource.transaction(async (em) => {
      if (!(await em.exists(Patient, { where: { id: patientId } }))) {
        throw new NotFoundException(`Patient ${patientId} not found`);
      }
      const [saved] = await this.addAllergies(em, patientId, [dto], user);
      return toFhirAllergy(saved);
    });
  }

  /** Changes one recorded allergy; clinicalStatus "inactive" retires it. */
  async updateAllergy(
    patientId: string,
    allergyId: string,
    dto: UpdateAllergyDto,
    user: AuthUser,
  ) {
    return this.dataSource.transaction(async (em) => {
      const [saved] = await this.changeAllergies(
        em,
        patientId,
        [{ ...dto, id: allergyId }],
        user,
      );
      return toFhirAllergy(saved);
    });
  }

  private async addAllergies(
    em: EntityManager,
    patientId: string,
    dtos: CreateAllergyDto[],
    recorder: AuthUser,
  ) {
    const saved = await em.save(
      dtos.map((dto) =>
        em.create(AllergyIntolerance, {
          clinicalStatus: 'active',
          ...allergyColumns(dto),
          patientId,
          practitionerId: actorId(recorder),
        }),
      ),
    );
    await this.auditTrail.record(
      recorder,
      saved.map((a) => ({
        action: 'CREATE',
        ...auditTarget('AllergyIntolerance', a),
      })),
      em,
    );
    return saved;
  }

  /**
   * Applies changes to the patient's allergies, keeping who recorded them. One
   * that isn't this patient's is a 404, which undoes the whole transaction.
   */
  private async changeAllergies(
    em: EntityManager,
    patientId: string,
    updates: AllergyUpdateDto[],
    user: AuthUser,
  ) {
    if (!updates.length) return [];
    const recorded = await em.find(AllergyIntolerance, {
      where: { patientId, id: In(updates.map((u) => u.id)) },
    });
    const changed = updates.map((update) => {
      const allergy = recorded.find((a) => a.id === update.id);
      if (!allergy) {
        throw new NotFoundException(
          `Allergy ${update.id} not found for patient ${patientId}`,
        );
      }
      const columns = allergyColumns(update, allergy);
      return { allergy, changes: changeOf(allergy, columns), columns };
    });
    const saved = await em.save(
      changed.map(({ allergy, columns }) => Object.assign(allergy, columns)),
    );
    await this.auditTrail.record(
      user,
      changed.map(({ allergy, changes }) => ({
        action: 'UPDATE',
        ...auditTarget('AllergyIntolerance', allergy),
        changes,
      })),
      em,
    );
    return saved;
  }

  // Conditions
  async getConditions(patientId: string, user: AuthUser) {
    const conditions = await this.conditionsRepo.find({ where: { patientId } });
    await this.auditTrail.readPatient(user, patientId, 'conditions');
    return conditions.map(toFhirCondition);
  }

  async addCondition(
    patientId: string,
    dto: CreateConditionDto,
    user: AuthUser,
  ) {
    const patient = await this.patientsRepo.findOne({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);
    const saved = await this.conditionsRepo.save(
      this.conditionsRepo.create({
        ...dto,
        patientId,
        practitionerId: actorId(user),
      }),
    );
    await this.auditTrail.record(user, {
      action: 'CREATE',
      ...auditTarget('Condition', saved),
    });
    return toFhirCondition(saved);
  }

  // Vitals / Observations
  async getVitals(patientId: string, user: AuthUser) {
    const obs = await this.observationsRepo.find({
      where: { patientId, category: 'vital-signs' },
      order: { effectiveDateTime: 'DESC' },
    });
    await this.auditTrail.readPatient(user, patientId, 'vital signs');
    return obs.map(toFhirObservation);
  }

  async getVitalsTrend(patientId: string, code: string, user: AuthUser) {
    const obs = await this.observationsRepo.find({
      where: { patientId, category: 'vital-signs', code },
      order: { effectiveDateTime: 'ASC' },
    });
    await this.auditTrail.readPatient(user, patientId, 'vital signs');
    return obs.map(toFhirObservation);
  }
}
