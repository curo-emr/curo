import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class DispenseMedicationDto {
  @IsUUID()
  medicationRequestId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantityValue?: number;

  @IsOptional()
  @IsString()
  quantityUnit?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
