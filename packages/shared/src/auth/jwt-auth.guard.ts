import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../enums';

/** Claims carried by access and refresh tokens (issued by the auth service). */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  practitionerId?: string | null;
  patientId?: string | null;
}

/** The user attached to `request.user` once the access token is verified. */
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  practitionerId: string | null;
  patientId: string | null;
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
  };
}

/** Who to record as the actor: the practitioner for staff, otherwise the user. */
export function actorId(user: AuthUser): string {
  return user.practitionerId ?? user.userId;
}

/** Verifies the `Authorization: Bearer <token>` header and sets `request.user`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();

    try {
      const payload = this.jwtService.verify<JwtPayload>(
        authHeader.split(' ')[1],
      );
      request.user = toAuthUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
