import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { VisitType } from '../../enums';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsNotEmpty()
  @IsString()
  practitionerId: string;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** What the visit is for: one of the clinic's visit types. */
  @IsEnum(VisitType, {
    message: `serviceType must be one of: ${Object.values(VisitType).join(', ')}`,
  })
  serviceType: VisitType;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsNumber()
  slotNumber?: number;

  @IsOptional()
  @IsBoolean()
  isWalkIn?: boolean;
}
