import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Gender, MaritalStatus } from '@curo/shared/enums';
import { CreateAllergyDto } from './create-allergy.dto';

export const INSURANCE_RELATIONSHIPS = [
  'self',
  'spouse',
  'child',
  'other',
] as const;

export class CreatePatientDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsNotEmpty()
  @IsString()
  birthDate: string; // YYYY-MM-DD

  @IsEnum(Gender)
  gender: Gender;

  // NIC is intentionally optional: minors have no NIC. The Personal Health Number
  // (server-generated when omitted) is the unique identifier instead.
  @IsOptional()
  @IsString()
  nic?: string;

  @IsOptional()
  @IsString()
  personalHealthNumber?: string;

  @IsOptional()
  @IsString()
  passportNumber?: string;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;

  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsString()
  insuranceGroupNumber?: string;

  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: string;

  @IsOptional()
  @IsString()
  insuranceHolderName?: string;

  @IsOptional()
  @IsIn(INSURANCE_RELATIONSHIPS)
  insuranceRelationship?: (typeof INSURANCE_RELATIONSHIPS)[number];

  /** Allergies to record with the new patient, saved in the same transaction. */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateAllergyDto)
  allergies?: CreateAllergyDto[];
}
