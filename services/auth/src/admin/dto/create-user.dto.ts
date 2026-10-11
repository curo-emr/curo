import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Gender, UserRole } from '@curo/shared/enums';
import { MIN_PASSWORD_LENGTH } from '../../auth/passwords';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  phone?: string;

  // Practitioner attributes
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
