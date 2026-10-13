import { PartialType, PickType } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateStockDto {
  /** The catalog drug received; its name, form and strength come from there. */
  @IsNotEmpty()
  @IsString()
  medicationCode: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  /** YYYY-MM-DD; an expired batch can't be received. */
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;
}

/** A correction to a batch; a count can go down to zero, but not below. */
export class UpdateStockDto extends PartialType(
  PickType(CreateStockDto, ['reorderThreshold', 'unitPrice', 'expiryDate']),
) {
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;
}
