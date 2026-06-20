import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
  OnModuleInit, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Patient } from '../entities/patient.entity';
import { AllergyIntolerance } from '../entities/allergy-intolerance.entity';
import { Condition } from '../entities/condition.entity';
import { Observation } from '../entities/observation.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { CreateConditionDto } from './dto/create-condition.dto';
import { toFhirPatient, toFhirAllergy, toFhirCondition, toFhirObservation } from './fhir.mapper';
import { UserRole } from '../enums';

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

  private generatePatientCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'CUR-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /** Luhn (mod-10) check digit for a numeric string payload. */
  private luhnCheckDigit(payload: string): number {
    let sum = 0;
    let double = true; // rightmost payload digit is doubled (check digit will be appended)
    for (let i = payload.length - 1; i >= 0; i--) {
      let d = payload.charCodeAt(i) - 48;
      if (double) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      double = !double;
    }
    return (10 - (sum % 10)) % 10;
  }

  /** Personal Health Number: YYYY(4) + random sequence(7) + Luhn check digit(1) = 12 digits. */
  private generatePhn(): string {
    const year = new Date().getFullYear().toString();
    let seq = '';
    for (let i = 0; i < 7; i++) seq += Math.floor(Math.random() * 10).toString();
    const payload = year + seq; // 11 digits
    return payload + this.luhnCheckDigit(payload).toString();
  }

  private async generateUniquePhn(): Promise<string> {
    let phn: string;
    let exists = true;
    do {
      phn = this.generatePhn();
      exists = !!(await this.patientsRepo.findOne({ where: { personalHealthNumber: phn } }));
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
      this.logger.log(`Backfilled PHN for ${missing.length} existing patient(s)`);
    } catch (err) {
      // Table may not exist yet on a brand-new DB; synchronize creates it on boot.
      this.logger.warn(`PHN backfill skipped: ${(err as Error).message}`);
    }
  }

  async create(dto: CreatePatientDto): Promise<any> {
    // Generate unique patient code
    let patientCode: string;
    let exists = true;
    do {
      patientCode = this.generatePatientCode();
      exists = !!(await this.patientsRepo.findOne({ where: { patientCode } }));
    } while (exists);

    // Generate the Personal Health Number unless one was explicitly supplied.
    const personalHealthNumber = dto.personalHealthNumber || (await this.generateUniquePhn());

    const patient = this.patientsRepo.create({ ...dto, patientCode, personalHealthNumber });
    const saved = await this.patientsRepo.save(patient);
    return toFhirPatient(saved);
  }

  async findAll(requestingUser: { role: string; userId: string }, search?: string): Promise<any[]> {
    if (requestingUser.role === UserRole.PATIENT) {
      throw new ForbiddenException('Patients cannot list all patients');
    }
    const query = this.patientsRepo.createQueryBuilder('p').where('p.active = true');
    if (search) {
      query.andWhere(
        '(p.firstName ILIKE :s OR p.lastName ILIKE :s OR p.patientCode ILIKE :s OR p.personalHealthNumber ILIKE :s OR p.nic ILIKE :s OR p.phone ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    const patients = await query.orderBy('p.createdAt', 'DESC').getMany();
    return patients.map((p) => toFhirPatient(p, requestingUser.role));
  }

  async findOne(id: string, requestingUser: { role: string; userId: string; patientId?: string }): Promise<any> {
    const patient = await this.patientsRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);

    if (requestingUser.role === UserRole.PATIENT) {
      const userPatient = await this.patientsRepo.findOne({ where: { userId: requestingUser.userId } });
      if (!userPatient || userPatient.id !== id) {
        throw new ForbiddenException('Patients can only view their own record');
      }
    }
    return toFhirPatient(patient, requestingUser.role);
  }

  async update(id: string, dto: UpdatePatientDto, requestingUser: { role: string }): Promise<any> {
    if (requestingUser.role === UserRole.PATIENT) {
      throw new ForbiddenException('Patients cannot update records via this endpoint');
    }
    const patient = await this.patientsRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    Object.assign(patient, dto);
    const saved = await this.patientsRepo.save(patient);
    return toFhirPatient(saved);
  }

  async findByCode(code: string, role?: string): Promise<any> {
    const patient = await this.patientsRepo.findOne({ where: { patientCode: code } });
    if (!patient) throw new NotFoundException(`Patient with code ${code} not found`);
    return toFhirPatient(patient, role);
  }

  async findMyRecord(userId: string): Promise<any> {
    const patient = await this.patientsRepo.findOne({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient record not found for this user');
    return toFhirPatient(patient);
  }

  // Allergies
  async getAllergies(patientId: string): Promise<any[]> {
    const allergies = await this.allergiesRepo.find({ where: { patientId } });
    return allergies.map(toFhirAllergy);
  }

  async addAllergy(patientId: string, dto: CreateAllergyDto, practitionerId: string): Promise<any> {
    const patient = await this.patientsRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);
    const allergy = this.allergiesRepo.create({ ...dto, patientId, practitionerId });
    const saved = await this.allergiesRepo.save(allergy);
    return toFhirAllergy(saved);
  }

  async deleteAllergy(allergyId: string): Promise<void> {
    await this.allergiesRepo.delete(allergyId);
  }

  // Conditions
  async getConditions(patientId: string): Promise<any[]> {
    const conditions = await this.conditionsRepo.find({ where: { patientId } });
    return conditions.map(toFhirCondition);
  }

  async addCondition(patientId: string, dto: CreateConditionDto, practitionerId: string): Promise<any> {
    const patient = await this.patientsRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);
    const condition = this.conditionsRepo.create({ ...dto, patientId, practitionerId });
    const saved = await this.conditionsRepo.save(condition);
    return toFhirCondition(saved);
  }

  // Vitals / Observations
  async getVitals(patientId: string): Promise<any[]> {
    const obs = await this.observationsRepo.find({
      where: { patientId, category: 'vital-signs' },
      order: { effectiveDateTime: 'DESC' },
    });
    return obs.map(toFhirObservation);
  }

  async getVitalsTrend(patientId: string, code: string): Promise<any[]> {
    const obs = await this.observationsRepo.find({
      where: { patientId, category: 'vital-signs', code },
      order: { effectiveDateTime: 'ASC' },
    });
    return obs.map(toFhirObservation);
  }
}
