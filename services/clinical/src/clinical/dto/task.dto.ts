import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TaskStatus } from '../../enums';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  priority?: string; // routine | urgent | asap | stat

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  focus?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  restriction?: Date; // deadline
}

/** Any task field except who owns it. */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
