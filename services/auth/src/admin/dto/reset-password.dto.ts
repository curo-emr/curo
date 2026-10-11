import { IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../auth/passwords';

export class ResetPasswordDto {
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword: string;
}
