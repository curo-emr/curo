/**
 * Reads a whole number from the environment, or `fallback` when it isn't set.
 * A value that isn't a whole number of at least `min` throws, so a typo stops
 * the service at startup instead of quietly running on the default.
 */
export function intFromEnv(name: string, fallback: number, min = 0): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} must be a whole number of at least ${min}`);
  }
  return value;
}
