import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreateVitalsDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  // Triage vitals are recorded before an encounter exists; they are tied to the
  // visit's appointment and linked to the encounter when the doctor creates it.
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

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
