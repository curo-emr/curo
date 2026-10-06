import { IsString, IsOptional, IsIn } from 'class-validator';

export const DOCUMENT_TYPES = [
  'referral-letter',
  'lab-report',
  'consent',
  'discharge-summary',
  'imaging',
  'other',
] as const;

/**
 * Sent as multipart/form-data text fields alongside the `file` part, so every
 * value arrives as a string.
 */
export class CreateDocumentDto {
  @IsString()
  patientId: string;

  @IsString()
  @IsIn(DOCUMENT_TYPES as unknown as string[])
  type: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsOptional()
  @IsString()
  relatedResourceId?: string;

  @IsOptional()
  @IsString()
  relatedResourceType?: string; // ServiceRequest | DiagnosticReport | Encounter

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  docStatus?: string; // preliminary | final | amended
}
