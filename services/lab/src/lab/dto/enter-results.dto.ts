import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class ResultItemDto {
  @IsNotEmpty()
  @IsString()
  code: string; // LOINC

  @IsNotEmpty()
  @IsString()
  display: string;

  @IsOptional()
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
  results: ResultItemDto[];

  @IsOptional()
  @IsString()
  conclusion?: string;
}
