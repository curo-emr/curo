import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { LabResultItem } from '../../entities/diagnostic-report.entity';

export class ResultItemDto implements LabResultItem {
  @IsNotEmpty()
  @IsString()
  code: string; // LOINC

  @IsNotEmpty()
  @IsString()
  display: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  valueString?: string;

  @IsOptional()
  @IsString()
  referenceRangeLow?: string;

  @IsOptional()
  @IsString()
  referenceRangeHigh?: string;

  @IsOptional()
  @IsString()
  referenceRangeText?: string;

  @IsOptional()
  @IsString()
  interpretation?: string; // N | H | L | HH | LL
}

/** The longest results text a lab can file; the lab portal's box mirrors it. */
export const RESULTS_TEXT_MAX_LENGTH = 20_000;

/**
 * Pasted results as they are kept: line endings made `\n`, the blank lines
 * before and the whitespace after dropped, and blank text made absent. The
 * first line keeps its indent, which lines up a printout's columns.
 */
function tidyResultsText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*\n/, '')
    .trimEnd();
  return text || undefined;
}

export class EnterResultsDto {
  @IsNotEmpty()
  @IsString()
  serviceRequestId: string;

  // May be left out when the report was uploaded as a file instead.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultItemDto)
  results?: ResultItemDto[];

  // The results as the lab pasted them (an analyser or lab system printout),
  // in place of typed values or alongside them.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => tidyResultsText(value))
  @IsString()
  @MaxLength(RESULTS_TEXT_MAX_LENGTH)
  resultsText?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;
}
