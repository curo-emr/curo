import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsNumber,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  serviceType?: string;

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
