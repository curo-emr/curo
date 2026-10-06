const DEV_JWT_SECRET = 'curo_jwt_secret_dev_2024_change_in_prod';

/**
 * Secret used to sign and verify access tokens.
 * Falls back to a well-known dev value, except in production where it must be set.
 */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  }
  return DEV_JWT_SECRET;
}
