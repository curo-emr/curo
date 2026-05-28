import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
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
export class PatientService {
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

  async create(dto: CreatePatientDto): Promise<any> {
    // Generate unique patient code
    let patientCode: string;
    let exists = true;
    do {
      patientCode = this.generatePatientCode();
      exists = !!(await this.patientsRepo.findOne({ where: { patientCode } }));
    } while (exists);

    const patient = this.patientsRepo.create({ ...dto, patientCode });
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
        '(p.firstName ILIKE :s OR p.lastName ILIKE :s OR p.patientCode ILIKE :s OR p.phone ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    const patients = await query.orderBy('p.createdAt', 'DESC').getMany();
    return patients.map(toFhirPatient);
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
    return toFhirPatient(patient);
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

  async findByCode(code: string): Promise<any> {
    const patient = await this.patientsRepo.findOne({ where: { patientCode: code } });
    if (!patient) throw new NotFoundException(`Patient with code ${code} not found`);
    return toFhirPatient(patient);
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
