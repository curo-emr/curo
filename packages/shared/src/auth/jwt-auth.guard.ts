import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UserRole } from '../enums';
import { sessionIsLive, type SessionState } from './session';

/** Claims carried by access and refresh tokens (issued by the auth service). */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  practitionerId?: string | null;
  patientId?: string | null;
  /** Staff display name; absent for patients, admins and tokens issued before it existed. */
  name?: string | null;
  /** Where staff work (a pharmacist's pharmacy, a technician's lab); absent when unassigned. */
  organizationId?: string | null;
  /** When the token was signed, in whole seconds; added by the signer. */
  iat?: number;
}

/** The user attached to `request.user` once the access token is verified. */
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  practitionerId: string | null;
  patientId: string | null;
  name: string | null;
  organizationId: string | null;
}

/** The parts of an HTTP request the auth guards read and write. */
export interface AuthRequest {
  headers: { authorization?: string };
  user?: AuthUser;
}

export function toAuthUser(payload: JwtPayload): AuthUser {
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    practitionerId: payload.practitionerId ?? null,
    patientId: payload.patientId ?? null,
    name: payload.name ?? null,
    organizationId: payload.organizationId ?? null,
  };
}

/** Who to record as the actor: the practitioner for staff, otherwise the user. */
export function actorId(
  user: Pick<AuthUser, 'practitionerId' | 'userId'>,
): string {
  return user.practitionerId ?? user.userId;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and sets `request.user`.
 * The token must also belong to a session that is still live: a suspension or
 * a password reset ends the sessions signed in before it, everywhere at once.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(authHeader.split(' ')[1]);
    } catch {
      throw new UnauthorizedException();
    }

    // Every service shares the database the auth service keeps accounts in.
    const [account] = await this.db.query<SessionState[]>(
      'SELECT "isActive", "sessionsEndedAt" FROM users WHERE id = $1',
      [payload.sub],
    );
    if (!sessionIsLive(account, payload.iat)) throw new UnauthorizedException();

    request.user = toAuthUser(payload);
    return true;
  }
}
