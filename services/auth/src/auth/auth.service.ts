import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Practitioner } from '../entities/practitioner.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UserRole, Gender } from '@curo/shared/enums';
import {
  jwtSecret,
  jwtRefreshSecret,
  type AuthUser,
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
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.isActive)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      patientId: dto.patientId,
      practitionerId: dto.practitionerId,
    });
    await this.usersRepo.save(user);
    return this.issueTokens(user);
  }

  async createStaff(
    dto: CreateStaffDto,
    requestingUser: Pick<AuthUser, 'role'>,
  ) {
    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only super admin can create staff accounts',
      );
    }

    const existing = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Create practitioner record
    const practitioner = this.practitionersRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      gender: dto.gender || Gender.UNKNOWN,
      role: dto.role,
      specialization: dto.specialization,
      qualification: dto.qualification,
      licenseNumber: dto.licenseNumber,
    });
    const savedPractitioner = await this.practitionersRepo.save(practitioner);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      practitionerId: savedPractitioner.id,
    });
    const savedUser = await this.usersRepo.save(user);

    // Link user back to practitioner
    await this.practitionersRepo.update(savedPractitioner.id, {
      userId: savedUser.id,
    });

    return {
      userId: savedUser.id,
      practitionerId: savedPractitioner.id,
      email: savedUser.email,
      role: savedUser.role,
      name: fullName(dto),
    };
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
      },
    };
  }
}
