import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateStockDto {
  /** The catalog drug received; its name, form and strength come from there. */
  @IsNotEmpty()
  @IsString()
  medicationCode: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  reorderThreshold?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;
}

export class UpdateStockDto {
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  reorderThreshold?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  expiryDate?: string;
}
