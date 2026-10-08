import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginAttempts } from './login-attempts';
import { User } from '../entities/user.entity';
import { Practitioner } from '../entities/practitioner.entity';
import { Patient } from '@curo/shared/database';
import { jwtSecret } from '@curo/shared/auth';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: { expiresIn: '15m' },
    }),
    TypeOrmModule.forFeature([User, Practitioner, Patient]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // One per app, with the default limits.
    { provide: LoginAttempts, useFactory: () => new LoginAttempts() },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
