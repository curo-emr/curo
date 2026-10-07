import { OmitType, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrganizationType } from '../../entities/organization.entity';

export class CreateOrganizationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(OrganizationType)
  type: OrganizationType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;
}

// The type is fixed once staff, stock or tests may hang off it: a pharmacy
// can't become a laboratory under its pharmacists.
export class UpdateOrganizationDto extends PartialType(
  OmitType(CreateOrganizationDto, ['type'] as const),
) {
  /** False deactivates: it leaves the directory and can't take new staff. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
