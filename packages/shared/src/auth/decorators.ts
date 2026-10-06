import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { AuthUser } from './jwt-auth.guard';

export const ROLES_KEY = 'roles';

/** Restricts a route or controller to the given roles (enforced by `RolesGuard`). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated user set by `JwtAuthGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
