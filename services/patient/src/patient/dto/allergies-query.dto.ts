import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsUUID } from 'class-validator';

/** GET /patients/allergies?patientIds=<id>,<id> — one page of a patient list. */
export class AllergiesQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  patientIds: string[];
}
