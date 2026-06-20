import {
  IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  type?: string; // defaults to 'consultation'

  @IsOptional()
  @IsString()
  paymentMethod?: string; // cash | card | insurance

  @IsOptional()
  @IsString()
  notes?: string;
}
