import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentMethod, PaymentType } from '../../enums';

export class CreatePaymentDto {
  /** A patient on file; with an appointment, the appointment's patient. */
  @IsUUID()
  patientId: string;

  /** The visit paid for: one payment each, and not one that was missed. */
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType; // defaults to consultation

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod; // defaults to cash

  @IsOptional()
  @IsString()
  notes?: string;
}
