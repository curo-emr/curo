import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Practitioner } from '../entities/practitioner.entity';
import { LoginDto } from './dto/login.dto';
import { LoginAttempts } from './login-attempts';
import {
  jwtSecret,
  jwtRefreshSecret,
  type JwtPayload,
} from '@curo/shared/auth';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

@Injectable()
export class AuthService {
  // Read once at startup, so a production deploy without it fails to boot.
  private readonly refreshSecret = jwtRefreshSecret();

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Practitioner)
    private practitionersRepo: Repository<Practitioner>,
    private jwtService: JwtService,
    private loginAttempts: LoginAttempts,
  ) {}

  /** Signs in from `ip`, the client's address; repeated failures are refused for a while (LoginAttempts). */
  async login(dto: LoginDto, ip: string) {
    this.loginAttempts.assertAllowed(dto.email, ip);

    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    const valid =
      !!user?.isActive &&
      (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !valid) {
      this.loginAttempts.recordFailure(dto.email, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.loginAttempts.recordSuccess(dto.email);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
      const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      return await this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, refreshToken, ...profile } = user;
    return profile;
  }

  async getPractitioners(role?: string) {
    const query = this.practitionersRepo
      .createQueryBuilder('p')
      .where('p.active = true');
    if (role) {
      query.andWhere('p.role = :role', { role });
    }
    const practitioners = await query.orderBy('p.lastName', 'ASC').getMany();
    return practitioners.map((p) => ({
      id: p.id,
      name: {
        first: p.firstName,
        last: p.lastName,
        full: fullName(p),
      },
      role: p.role,
      specialty: p.specialization ?? '',
      phone: p.phone ?? '',
      email: p.email,
      qualification: p.qualification ?? '',
      licenseNumber: p.licenseNumber ?? '',
    }));
  }

  private async issueTokens(user: User) {
    const practitioner = user.practitionerId
      ? await this.practitionersRepo.findOne({
          where: { id: user.practitionerId },
        })
      : null;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      practitionerId: user.practitionerId ?? null,
      patientId: user.patientId ?? null,
      name: practitioner ? fullName(practitioner) : null,
      // Read again on every refresh, so a reassignment reaches the session
      // within one access-token lifetime.
      organizationId: practitioner?.organizationId ?? null,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret(),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        patientId: user.patientId,
        practitionerId: user.practitionerId,
        name: payload.name,
        organizationId: payload.organizationId,
      },
    };
  }
}
