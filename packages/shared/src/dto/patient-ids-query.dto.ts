import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsUUID } from 'class-validator';
import { MAX_PAGE_SIZE } from '../fhir';

/** `?patientIds=<id>,<id>` — the patients on one page of a patient list. */
export class PatientIdsQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_PAGE_SIZE)
  @IsUUID('all', { each: true })
  patientIds: string[];
}
