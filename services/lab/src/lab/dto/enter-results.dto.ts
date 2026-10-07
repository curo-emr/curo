import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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

export class EnterResultsDto {
  @IsNotEmpty()
  @IsString()
  serviceRequestId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ResultItemDto)
  results: ResultItemDto[];

  @IsOptional()
  @IsString()
  conclusion?: string;
}
