import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '../../enums';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  cancelledReason?: string;

  @IsOptional()
  @IsString()
  encounterId?: string;
}
