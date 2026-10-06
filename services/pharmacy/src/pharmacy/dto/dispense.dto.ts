import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class DispenseMedicationDto {
  @IsNotEmpty()
  @IsString()
  medicationRequestId: string;

  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsNotEmpty()
  @IsString()
  dispenserName: string;

  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @IsOptional()
  @IsString()
  quantityUnit?: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
