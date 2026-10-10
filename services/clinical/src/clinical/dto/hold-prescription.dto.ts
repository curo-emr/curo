import { IsString, Matches, MaxLength } from 'class-validator';

export class HoldPrescriptionDto {
  /** Why it can't be dispensed yet, e.g. "Out of stock until Friday". */
  @IsString()
  @Matches(/\S/, { message: 'reason must not be blank' })
  @MaxLength(500)
  reason: string;
}
