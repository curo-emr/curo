import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePrescriptionDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  /** The pharmacy the prescription is sent to; only its pharmacists dispense it. */
  @IsUUID()
  performerOrganizationId: string;

  /** A drug in the medication catalog; the prescription takes its name from there. */
  @IsNotEmpty()
  @IsString()
  medicationCode: string;

  @IsOptional()
  @IsString()
  dosageText?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

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
