import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { endSessions } from '@curo/shared/auth';
import { User } from '../entities/user.entity';
import { LoginAttempts } from './login-attempts';

export const MIN_PASSWORD_LENGTH = 8;

/** Sets passwords, the same way for everyone who can give or reset one. */
@Injectable()
export class Passwords {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private loginAttempts: LoginAttempts,
  ) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Gives `user` a new password. Every session signed in before it ends, in
   * case someone else has the old one, and a sign-in lockout is lifted, since
   * whoever asked for a reset has often locked themselves out guessing.
   */
  async reset(user: User, newPassword: string): Promise<void> {
    user.passwordHash = await this.hash(newPassword);
    endSessions(user);
    await this.usersRepo.save(user);
    this.loginAttempts.clearFailures(user.email);
  }
}
