import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { jwtSecret } from './jwt-secret';

/**
 * Import once in a service's AppModule. Makes `JwtService` (configured with
 * `jwtSecret()`), `JwtAuthGuard` and `RolesGuard` available to every module.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({ useFactory: () => ({ secret: jwtSecret() }) }),
  ],
  providers: [JwtAuthGuard, RolesGuard],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class JwtAuthModule {}
