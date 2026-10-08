/** A human-readable message from an API error (NestJS puts it in `message`, sometimes as an array). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(", ") : (message ?? fallback);
}

/** The HTTP status of an API error, or undefined when no response arrived (offline, timeout). */
export function apiErrorStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

/** The request's result, or null when the API answers 404. Any other failure still throws. */
export async function nullIfNotFound<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (err) {
    if (apiErrorStatus(err) === 404) return null;
    throw err;
  }
}
