import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateVitalsDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsNotEmpty()
  @IsString()
  code: string; // LOINC code e.g. "8310-5" for body temp

  @IsNotEmpty()
  @IsString()
  display: string;

  @IsOptional()
  @IsNumber()
  valueQuantity?: number;

  @IsOptional()
  @IsString()
  valueUnit?: string;

  @IsOptional()
  @IsString()
  valueString?: string;

  @IsOptional()
  @IsString()
  interpretation?: string;

  @IsOptional()
  @IsString()
  effectiveDateTime?: string;

  @IsOptional()
  components?: any[];
}
