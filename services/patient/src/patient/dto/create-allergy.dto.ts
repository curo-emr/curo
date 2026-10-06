import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  AllergyIntoleranceCriticality,
  AllergyIntoleranceType,
} from '../../enums';

export class CreateAllergyDto {
  @IsEnum(AllergyIntoleranceType)
  type: AllergyIntoleranceType;

  @IsEnum(AllergyIntoleranceCriticality)
  criticality: AllergyIntoleranceCriticality;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  display: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  clinicalStatus?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  onsetDate?: string;
}
