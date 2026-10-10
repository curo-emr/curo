import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SessionDto {
  /** 0 = Sunday … 6 = Saturday. */
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @Matches(CLOCK_TIME, { message: 'start must be a time like 09:00' })
  start: string;

  @Matches(CLOCK_TIME, { message: 'end must be a time like 17:30' })
  end: string;

  @IsInt()
  @Min(5)
  @Max(240)
  slotMinutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  room?: string;
}

/** A doctor's whole week; it replaces the sessions they had. */
export class SetSessionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionDto)
  sessions: SessionDto[];
}
