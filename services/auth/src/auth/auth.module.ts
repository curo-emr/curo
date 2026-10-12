import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginAttempts } from './login-attempts';
import { Passwords } from './passwords';
import { User } from '../entities/user.entity';
import { Practitioner } from '../entities/practitioner.entity';
import { Patient } from '@curo/shared/database';

@Module({
  imports: [TypeOrmModule.forFeature([User, Practitioner, Patient])],
  controllers: [AuthController],
  providers: [
    AuthService,
    // One per app, with the default limits.
    { provide: LoginAttempts, useFactory: () => new LoginAttempts() },
    Passwords,
  ],
  exports: [AuthService, LoginAttempts, Passwords],
})
export class AuthModule {}
