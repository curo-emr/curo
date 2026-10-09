import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, QueryFailedError } from 'typeorm';
import { Appointment, NO_DOUBLE_BOOKING } from '../entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UserRole } from '@curo/shared/enums';
import {
  dayBounds,
  parseList,
  parsePagination,
  toSearchset,
  PaginationQuery,
} from '@curo/shared/fhir';
import { AppointmentStatus, QueueStage } from '../enums';
import { assertQueueTransition, queueStageForStatus } from './queue-stage';
import type { AuthUser } from '@curo/shared/auth';

function toFhirAppointment(a: Appointment) {
  return {
    resourceType: 'Appointment',
    id: a.id,
    status: a.status,
    serviceType: a.serviceType
      ? [{ coding: [{ code: a.serviceType }] }]
      : undefined,
    reasonCode: a.reasonCode ? [{ text: a.reasonCode }] : undefined,
    description: a.description,
    start: a.start,
    end: a.end,
    comment: a.comment,
    participant: [
      { actor: { reference: `Patient/${a.patientId}` }, status: 'accepted' },
      {
        actor: { reference: `Practitioner/${a.practitionerId}` },
        status: 'accepted',
      },
    ],
    extension: [
      { url: 'urn:curo:slotNumber', valueInteger: a.slotNumber },
      { url: 'urn:curo:isWalkIn', valueBoolean: a.isWalkIn },
      a.cancelledReason && {
        url: 'urn:curo:cancelledReason',
        valueString: a.cancelledReason,
      },
      a.queueStage && { url: 'urn:curo:queueStage', valueString: a.queueStage },
    ].filter(Boolean),
    meta: { lastUpdated: a.updatedAt },
  };
}

/** Filters for `findAll`; days are YYYY-MM-DD. */
export interface AppointmentFilters {
  date?: string;
  from?: string;
  to?: string;
  practitionerId?: string;
  patientId?: string;
  status?: string;
  queueStage?: string;
  _sort?: string;
}

const isAppointmentStatus = (value: string): value is AppointmentStatus =>
  (Object.values(AppointmentStatus) as string[]).includes(value);

/** Whether a save failed because the doctor is already booked at that time. */
const isDoubleBooking = (err: unknown) =>
  err instanceof QueryFailedError &&
  (err.driverError as { constraint?: string }).constraint === NO_DOUBLE_BOOKING;

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepo: Repository<Appointment>,
  ) {}

  async create(dto: CreateAppointmentDto) {
    const start = new Date(dto.start);
    const end = new Date(dto.end);
    if (end <= start) {
      throw new BadRequestException('An appointment must end after it starts');
    }
    const appointment = this.appointmentsRepo.create({ ...dto, start, end });
    return toFhirAppointment(await this.save(appointment));
  }

  /** Saves a booking, turning a clash with the doctor's other appointments into a 409. */
  private async save(appointment: Appointment) {
    try {
      return await this.appointmentsRepo.save(appointment);
    } catch (err) {
      if (isDoubleBooking(err)) {
        throw new ConflictException(
          'The doctor already has an appointment at this time. Pick another time.',
        );
      }
      throw err;
    }
  }

  /**
   * The appointments `requestingUser` may see. `date`, or `from` and `to`, are
   * whole days (`date` wins); `status` and `queueStage` are comma-separated
   * lists. Earliest first, or latest first with `_sort=-start`.
   */
  async findAll(
    requestingUser: AuthUser,
    filters?: AppointmentFilters,
    pagination: PaginationQuery = {},
  ) {
    const { page, pageSize, skip, take } = parsePagination(pagination);
    const query = this.appointmentsRepo.createQueryBuilder('a');

    if (
      requestingUser.role === UserRole.DOCTOR &&
      requestingUser.practitionerId
    ) {
      query.where('a.practitionerId = :pid', {
        pid: requestingUser.practitionerId,
      });
    } else if (
      requestingUser.role === UserRole.PATIENT &&
      requestingUser.patientId
    ) {
      query.where('a.patientId = :pid', { pid: requestingUser.patientId });
    }

    const from = filters?.date ?? filters?.from;
    const to = filters?.date ?? filters?.to;
    if (from)
      query.andWhere('a.start >= :from', { from: dayBounds(from).start });
    if (to) query.andWhere('a.start <= :to', { to: dayBounds(to).end });
    const status = parseList(filters?.status);
    if (status.length) {
      const known = status.filter(isAppointmentStatus);
      query.andWhere(known.length ? 'a.status IN (:...known)' : '1 = 0', {
        known,
      });
    }
    if (filters?.practitionerId && requestingUser.role !== UserRole.DOCTOR) {
      query.andWhere('a.practitionerId = :pr', { pr: filters.practitionerId });
    }
    if (filters?.patientId) {
      query.andWhere('a.patientId = :pa', { pa: filters.patientId });
    }
    if (filters?.queueStage) {
      query.andWhere('a.queueStage IN (:...stages)', {
        stages: filters.queueStage.split(','),
      });
    }

    const [appointments, total] = await query
      .orderBy('a.start', filters?._sort === '-start' ? 'DESC' : 'ASC')
      .addOrderBy('a.id', 'ASC')
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

  async findOne(id: string) {
    const a = await this.appointmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException(`Appointment ${id} not found`);
    return toFhirAppointment(a);
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const a = await this.appointmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException(`Appointment ${id} not found`);
    if (dto.status && dto.status !== a.status) {
      const stage = queueStageForStatus(dto.status, a.queueStage);
      if (stage !== undefined) a.queueStage = stage;
    }
    Object.assign(a, dto);
    // Re-booking a cancelled appointment takes its slot back, so it can clash too.
    return toFhirAppointment(await this.save(a));
  }

  async updateQueueStage(
    id: string,
    stage: QueueStage,
    user: Pick<AuthUser, 'role' | 'practitionerId'>,
  ) {
    const a = await this.appointmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException(`Appointment ${id} not found`);
    if (
      user.role === UserRole.DOCTOR &&
      a.practitionerId !== user.practitionerId
    ) {
      throw new ForbiddenException('Doctors can only move their own patients');
    }
    if (!assertQueueTransition(a.queueStage, stage, user.role))
      return toFhirAppointment(a);
    a.queueStage = stage;
    const saved = await this.appointmentsRepo.save(a);
    return toFhirAppointment(saved);
  }

  async getDoctorSchedule(practitionerId: string, date: string) {
    const { start, end } = dayBounds(date);
    const appointments = await this.appointmentsRepo.find({
      where: {
        practitionerId,
        start: Between(start, end),
      },
      order: { start: 'ASC' },
    });

    const queue = appointments
      .filter((a) =>
        [
          AppointmentStatus.BOOKED,
          AppointmentStatus.ARRIVED,
          AppointmentStatus.FULFILLED,
        ].includes(a.status),
      )
      .map((a, idx) => ({ queuePosition: idx + 1, ...toFhirAppointment(a) }));

    return {
      practitionerId,
      date,
      totalBooked: appointments.filter(
        (a) => a.status === AppointmentStatus.BOOKED,
      ).length,
      totalArrived: appointments.filter(
        (a) => a.status === AppointmentStatus.ARRIVED,
      ).length,
      totalFulfilled: appointments.filter(
        (a) => a.status === AppointmentStatus.FULFILLED,
      ).length,
      queue,
    };
  }

  async getPatientAppointments(patientId: string) {
    const appointments = await this.appointmentsRepo.find({
      where: { patientId },
      order: { start: 'DESC' },
    });
    return appointments.map(toFhirAppointment);
  }
}
