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

/**
 * Why signing in failed, for the sign-in form: wrong credentials, the server's own
 * reason (such as a lockout after too many tries), or no answer at all.
 */
export function signInErrorMessage(err: unknown): string {
  const status = apiErrorStatus(err);
  if (status === 401) return "Invalid email or password.";
  if (status === undefined) return "Couldn't reach the server. Check your connection and try again.";
  return apiErrorMessage(err, "Couldn't sign in. Try again in a moment.");
}
