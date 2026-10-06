import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateStockDto {
  @IsNotEmpty()
  @IsString()
  medicationCode: string;

  @IsNotEmpty()
  @IsString()
  medicationName: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  form?: string;

  @IsOptional()
  @IsString()
  strength?: string;

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
