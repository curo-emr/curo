import { IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../auth/passwords';

export class PortalPasswordDto {
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;
}
