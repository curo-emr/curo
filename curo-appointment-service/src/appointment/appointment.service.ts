import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UserRole, AppointmentStatus } from '../enums';
import { parsePagination, toSearchset, PaginationQuery } from '../common/fhir-bundle';

function toFhirAppointment(a: Appointment) {
  return {
    resourceType: 'Appointment',
    id: a.id,
    status: a.status,
    serviceType: a.serviceType ? [{ coding: [{ code: a.serviceType }] }] : undefined,
    reasonCode: a.reasonCode ? [{ text: a.reasonCode }] : undefined,
    description: a.description,
    start: a.start,
    end: a.end,
    comment: a.comment,
    participant: [
      { actor: { reference: `Patient/${a.patientId}` }, status: 'accepted' },
      { actor: { reference: `Practitioner/${a.practitionerId}` }, status: 'accepted' },
    ],
    extension: [
      { url: 'urn:curo:slotNumber', valueInteger: a.slotNumber },
      { url: 'urn:curo:isWalkIn', valueBoolean: a.isWalkIn },
      a.cancelledReason && { url: 'urn:curo:cancelledReason', valueString: a.cancelledReason },
    ].filter(Boolean),
    meta: { lastUpdated: a.updatedAt },
  };
}

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepo: Repository<Appointment>,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<any> {
    const appointment = this.appointmentsRepo.create({
      ...dto,
      start: new Date(dto.start),
      end: new Date(dto.end),
    });
    const saved = await this.appointmentsRepo.save(appointment);
    return toFhirAppointment(saved);
  }

  async findAll(requestingUser: { role: string; userId: string; practitionerId?: string; patientId?: string }, filters?: { date?: string; practitionerId?: string; patientId?: string }, pagination: PaginationQuery = {}): Promise<any> {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const query = this.appointmentsRepo.createQueryBuilder('a');

    if (requestingUser.role === UserRole.DOCTOR && requestingUser.practitionerId) {
      query.where('a.practitionerId = :pid', { pid: requestingUser.practitionerId });
    } else if (requestingUser.role === UserRole.PATIENT && requestingUser.patientId) {
      query.where('a.patientId = :pid', { pid: requestingUser.patientId });
    }

    if (filters?.date) {
      const dayStart = new Date(filters.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(filters.date);
      dayEnd.setHours(23, 59, 59, 999);
      query.andWhere('a.start BETWEEN :s AND :e', { s: dayStart, e: dayEnd });
    }
    if (filters?.practitionerId && requestingUser.role !== UserRole.DOCTOR) {
      query.andWhere('a.practitionerId = :pr', { pr: filters.practitionerId });
    }
    if (filters?.patientId) {
      query.andWhere('a.patientId = :pa', { pa: filters.patientId });
    }

    const [appointments, total] = await query
      .orderBy('a.start', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return toSearchset(appointments.map(toFhirAppointment), total, {
      page,
      pageSize,
      baseUrl: '/appointments',
      query: { ...filters },
    });
  }

  async findOne(id: string): Promise<any> {
    const a = await this.appointmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException(`Appointment ${id} not found`);
    return toFhirAppointment(a);
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<any> {
    const a = await this.appointmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException(`Appointment ${id} not found`);
    Object.assign(a, dto);
    const saved = await this.appointmentsRepo.save(a);
    return toFhirAppointment(saved);
  }

  async getDoctorSchedule(practitionerId: string, date: string): Promise<any> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await this.appointmentsRepo.find({
      where: {
        practitionerId,
        start: Between(dayStart, dayEnd),
      },
      order: { start: 'ASC' },
    });

    const queue = appointments
      .filter(a => [AppointmentStatus.BOOKED, AppointmentStatus.ARRIVED, AppointmentStatus.FULFILLED].includes(a.status))
      .map((a, idx) => ({ queuePosition: idx + 1, ...toFhirAppointment(a) }));

    return {
      practitionerId,
      date,
      totalBooked: appointments.filter(a => a.status === AppointmentStatus.BOOKED).length,
      totalArrived: appointments.filter(a => a.status === AppointmentStatus.ARRIVED).length,
      totalFulfilled: appointments.filter(a => a.status === AppointmentStatus.FULFILLED).length,
      queue,
    };
  }

  async getPatientAppointments(patientId: string): Promise<any[]> {
    const appointments = await this.appointmentsRepo.find({
      where: { patientId },
      order: { start: 'DESC' },
    });
    return appointments.map(toFhirAppointment);
  }
}
