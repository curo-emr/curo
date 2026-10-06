import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../entities/user.entity';
import { Practitioner } from '../entities/practitioner.entity';
import { Patient } from '../entities/patient.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod',
      signOptions: { expiresIn: '15m' },
    }),
    TypeOrmModule.forFeature([User, Practitioner, Patient]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
