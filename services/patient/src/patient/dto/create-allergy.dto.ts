import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  AllergyIntoleranceCriticality,
  AllergyIntoleranceType,
} from '../../enums';

/** "inactive" or "resolved" retires an allergy: it stays on record, but no longer shows as one the patient has. */
export const ALLERGY_STATUSES = ['active', 'inactive', 'resolved'] as const;
export type AllergyStatus = (typeof ALLERGY_STATUSES)[number];

/** How bad the reaction is (FHIR reaction.severity). */
export const REACTION_SEVERITIES = ['mild', 'moderate', 'severe'] as const;
export type ReactionSeverity = (typeof REACTION_SEVERITIES)[number];

export class CreateAllergyDto {
  @IsOptional()
  @IsEnum(AllergyIntoleranceType)
  type?: AllergyIntoleranceType;

  /** The risk of a future reaction. Without it, a severe reaction makes it high, any other low. */
  @IsOptional()
  @IsEnum(AllergyIntoleranceCriticality)
  criticality?: AllergyIntoleranceCriticality;

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
  @IsIn(ALLERGY_STATUSES)
  clinicalStatus?: AllergyStatus;

  /** What the reaction is, such as "Rash" or "Anaphylaxis". */
  @IsOptional()
  @IsString()
  reaction?: string;

  @IsOptional()
  @IsIn(REACTION_SEVERITIES)
  severity?: ReactionSeverity;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  onsetDate?: string;
}

export class UpdateAllergyDto extends PartialType(CreateAllergyDto) {}

/** A change to one of the patient's recorded allergies, inside a patient update. */
export class AllergyUpdateDto extends UpdateAllergyDto {
  @IsUUID()
  id: string;
}
