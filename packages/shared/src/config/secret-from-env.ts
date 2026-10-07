/**
 * Reads a secret from the environment. Outside production a missing value falls
 * back to `devDefault`, so a fresh checkout runs without setup; in production
 * it throws instead, so a service never starts on a well-known dev secret.
 */
export function secretFromEnv(name: string, devDefault: string): string {
  const secret = process.env[name];
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set when NODE_ENV=production`);
  }
  return devDefault;
}
