import { IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';

export class DispenseMedicationDto {
  @IsUUID()
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
