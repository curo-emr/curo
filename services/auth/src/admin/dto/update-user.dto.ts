import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Practitioner profile fields the admin may correct.
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  /** Where they work; which kinds of organization depend on the role. */
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
