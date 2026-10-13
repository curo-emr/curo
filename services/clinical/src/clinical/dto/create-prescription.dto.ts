import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePrescriptionDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  /**
   * The patient buys it at a pharmacy of their choice, so it is sent to no
   * pharmacy here, and the drug may be one the catalog doesn't list.
   */
  @IsOptional()
  @IsBoolean()
  boughtOutside?: boolean;

  /** The pharmacy the prescription is sent to; only its pharmacists dispense it. Not for one bought outside. */
  @ValidateIf((dto: CreatePrescriptionDto) => !dto.boughtOutside)
  @IsUUID()
  performerOrganizationId?: string;

  /**
   * A drug in the medication catalog; the prescription takes its name from
   * there. One bought outside may be named instead (medicationDisplay).
   */
  @ValidateIf(
    (dto: CreatePrescriptionDto) =>
      !dto.boughtOutside || !dto.medicationDisplay,
  )
  @IsNotEmpty()
  @IsString()
  medicationCode?: string;

  /** The name of a drug bought outside that the catalog doesn't list. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (dto: CreatePrescriptionDto) => !!dto.boughtOutside && !dto.medicationCode,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  medicationDisplay?: string;

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
