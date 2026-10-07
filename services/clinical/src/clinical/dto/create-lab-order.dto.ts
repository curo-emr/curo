import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import type { LabPanelTest } from '@curo/shared/database';

export class CreateLabOrderDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  /** The lab the test is sent to; only its staff will see it. */
  @IsUUID()
  performerOrganizationId: string;

  @IsNotEmpty()
  @IsString()
  code: string; // lab panel LOINC code

  @IsNotEmpty()
  @IsString()
  display: string;

  @IsOptional()
  @IsArray()
  testPanel?: LabPanelTest[];

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
