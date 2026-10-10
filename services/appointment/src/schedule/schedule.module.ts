import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorSession } from '../entities/doctor-session.entity';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorSession])],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
