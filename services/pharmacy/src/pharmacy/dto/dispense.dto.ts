import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class DispenseMedicationDto {
  @IsNotEmpty()
  @IsString()
  medicationRequestId: string;

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
