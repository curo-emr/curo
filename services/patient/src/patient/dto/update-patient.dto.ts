import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreatePatientDto } from './create-patient.dto';
import { AllergyUpdateDto, CreateAllergyDto } from './create-allergy.dto';

export class UpdatePatientDto extends PartialType(
  OmitType(CreatePatientDto, ['allergies'] as const),
) {
  /** Allergies to add, saved in the same transaction as the rest of the change. */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateAllergyDto)
  newAllergies?: CreateAllergyDto[];

  /**
   * Changes to allergies already recorded for this patient; clinicalStatus
   * "inactive" retires one. Doctors and super admins only.
   */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AllergyUpdateDto)
  allergyUpdates?: AllergyUpdateDto[];
}
