import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ICD10_CODE, tidyIcd10Code } from '../icd10';

/**
 * A diagnosis in the doctor's words, with its ICD-10 code when they give one
 * (a code is helpful for reporting but isn't needed to record what was found).
 * A code is tidied as written ("r519" → "R51.9"), and blank is no code.
 */
export class DiagnosisDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? tidyIcd10Code(value) || null : value,
  )
  @Matches(ICD10_CODE, { message: 'code must be an ICD-10 code, like R51.9' })
  code?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  display: string;
}
