/** A human-readable message from an API error (NestJS puts it in `message`, sometimes as an array). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(", ") : (message ?? fallback);
}
