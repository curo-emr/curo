import { secretFromEnv } from '../config';

/** Secret used to sign and verify access tokens. */
export function jwtSecret(): string {
  return secretFromEnv('JWT_SECRET', 'curo_jwt_secret_dev_2024_change_in_prod');
}

/** Secret used to sign and verify refresh tokens (auth service only). */
export function jwtRefreshSecret(): string {
  return secretFromEnv(
    'JWT_REFRESH_SECRET',
    'curo_refresh_secret_dev_2024_change_in_prod',
  );
}
