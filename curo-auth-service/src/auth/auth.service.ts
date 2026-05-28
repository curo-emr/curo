import {
  Injectable, UnauthorizedException, ConflictException, ForbiddenException,
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
import { UserRole, Gender } from '../enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Practitioner)
    private practitionersRepo: Repository<Practitioner>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
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

  async createStaff(dto: CreateStaffDto, requestingUser: { role: string }) {
    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admin can create staff accounts');
    }

    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    // Create practitioner record
    const practitioner = this.practitionersRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      gender: (dto.gender as Gender) || Gender.UNKNOWN,
      role: dto.role as UserRole,
      specialization: dto.specialization,
      qualification: dto.qualification,
      licenseNumber: dto.licenseNumber,
    });
    const savedPractitioner = await this.practitionersRepo.save(practitioner);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role as UserRole,
      practitionerId: savedPractitioner.id,
    });
    const savedUser = await this.usersRepo.save(user);

    // Link user back to practitioner
    await this.practitionersRepo.update(savedPractitioner.id, { userId: savedUser.id });

    return {
      userId: savedUser.id,
      practitionerId: savedPractitioner.id,
      email: savedUser.email,
      role: savedUser.role,
      name: `${dto.firstName} ${dto.lastName}`,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'curo_refresh_secret_dev_2024_change_in_prod',
      });
      const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      return this.issueTokens(user);
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
    const query = this.practitionersRepo.createQueryBuilder('p').where('p.isActive = true');
    if (role) {
      query.andWhere('p.role = :role', { role });
    }
    const practitioners = await query.orderBy('p.lastName', 'ASC').getMany();
    return practitioners.map(p => ({
      id: p.id,
      name: {
        first: p.firstName,
        last: p.lastName,
        full: `${p.firstName} ${p.lastName}`,
      },
      role: p.role,
      specialty: p.specialization ?? '',
      phone: p.phone ?? '',
      email: p.email,
      qualification: p.qualification ?? '',
      licenseNumber: p.licenseNumber ?? '',
    }));
  }

  private issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = this.jwtService.sign(payload as any, {
      secret: process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod',
      expiresIn: '900s',
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshToken = this.jwtService.sign(payload as any, {
      secret: process.env.JWT_REFRESH_SECRET || 'curo_refresh_secret_dev_2024_change_in_prod',
      expiresIn: '604800s',
    } as any);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        patientId: user.patientId,
        practitionerId: user.practitionerId,
      },
    };
  }
}
