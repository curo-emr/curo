import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

/** An audit entry as submitted by a client; who did it comes from the token. */
export class CreateAuditLogDto {
  @IsNotEmpty()
  @IsString()
  action: string;

  @IsNotEmpty()
  @IsString()
  resourceType: string;

  @IsNotEmpty()
  @IsString()
  resourceId: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsObject()
  changes?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  outcomeDescription?: string;
}
