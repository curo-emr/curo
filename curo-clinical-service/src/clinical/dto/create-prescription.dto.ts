import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreatePrescriptionDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsNotEmpty()
  @IsString()
  medicationCode: string;

  @IsNotEmpty()
  @IsString()
  medicationDisplay: string;

  @IsOptional()
  @IsString()
  dosageText?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @IsOptional()
  @IsString()
  quantityUnit?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
