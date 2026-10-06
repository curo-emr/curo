import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../enums';

/** The user attached to `request.user` once the access token is verified. */
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  practitionerId: string | null;
  patientId: string | null;
}

/** Verifies the `Authorization: Bearer <token>` header and sets `request.user`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();

    try {
      const payload = this.jwtService.verify(authHeader.split(' ')[1]);
      const user: AuthUser = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        practitionerId: payload.practitionerId ?? null,
        patientId: payload.patientId ?? null,
      };
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
