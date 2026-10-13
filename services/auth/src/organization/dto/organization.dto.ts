import { ApiHideProperty, OmitType, PartialType } from '@nestjs/swagger';
import {
  Equals,
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

export class UpdateOrganizationDto extends PartialType(
  OmitType(CreateOrganizationDto, ['type'] as const),
) {
  // The type is fixed once staff, stock or tests may hang off it: a pharmacy
  // can't become a laboratory under its pharmacists. Declared so a request
  // that tries is refused rather than having it quietly stripped. Not part of
  // the documented request body.
  @ApiHideProperty()
  @Equals(undefined, {
    message: "An organization's type can't be changed once it is created",
  })
  type?: never;

  /** False deactivates: it leaves the directory and can't take new staff. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
