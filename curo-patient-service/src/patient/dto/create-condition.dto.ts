import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ConditionClinicalStatus } from '../../enums';

export class CreateConditionDto {
  @IsEnum(ConditionClinicalStatus)
  clinicalStatus: ConditionClinicalStatus;

  @IsNotEmpty()
  @IsString()
  code: string; // ICD-10

  @IsNotEmpty()
  @IsString()
  display: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  verificationStatus?: string;

  @IsOptional()
  @IsString()
  onsetDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  encounterId?: string;
}
