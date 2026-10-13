import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { endSessions } from '@curo/shared/auth';
import { User } from '../entities/user.entity';
import { LoginAttempts } from './login-attempts';

export const MIN_PASSWORD_LENGTH = 8;

const BCRYPT_ROUNDS = 12;

// Compared against when there is no account, so checking a password takes as
// long for an email without one and the time taken doesn't give that away.
const NO_ACCOUNT_HASH = bcrypt.hash(randomUUID(), BCRYPT_ROUNDS);

/** Sets and checks passwords, the same way for everyone who can give or reset one. */
@Injectable()
export class Passwords {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private loginAttempts: LoginAttempts,
  ) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /** Whether `password` is `user`'s; false when there is no user, after as long a check. */
  async matches(user: User | null, password: string): Promise<boolean> {
    const hash = user?.passwordHash ?? (await NO_ACCOUNT_HASH);
    return (await bcrypt.compare(password, hash)) && user !== null;
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
