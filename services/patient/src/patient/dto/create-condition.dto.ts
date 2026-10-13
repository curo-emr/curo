import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DiagnosisDto } from '@curo/shared/dto';
import { ConditionClinicalStatus } from '@curo/shared/enums';

export class CreateConditionDto extends DiagnosisDto {
  @IsEnum(ConditionClinicalStatus)
  clinicalStatus: ConditionClinicalStatus;

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
