import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// A category (letter, digit, letter or digit), then up to four characters
// after the dot: R51.9, J45.909, S72.001A.
const ICD10_CODE = /^[A-Z]\d[\dA-Z](\.[\dA-Z]{1,4})?$/;

/**
 * An ICD-10 code as written, in capitals and dotted after the category
 * ("r519" → "R51.9"); blank is no code. Anything else is left for validation.
 */
export function toIcd10Code(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const code = value.replace(/\s/g, '').toUpperCase();
  if (!code) return null;
  return code.length > 3 && !code.includes('.')
    ? `${code.slice(0, 3)}.${code.slice(3)}`
    : code;
}

/**
 * A diagnosis in the doctor's words, with its ICD-10 code when they give one
 * (a code is helpful for reporting but isn't needed to record what was found).
 */
export class DiagnosisDto {
  @IsOptional()
  @Transform(({ value }) => toIcd10Code(value))
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
