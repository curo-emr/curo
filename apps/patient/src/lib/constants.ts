export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  HOME: "/dashboard",
  APPOINTMENTS: "/appointments",
  VISITS: "/visits",
  VISIT: (id: string) => `/visits/${id}`,
  MEDICINES: "/medicines",
  TEST_RESULTS: "/test-results",
  MY_HEALTH: "/my-health",
  ACCOUNT: "/account",
} as const;

/** Who a patient asks to change their details, book an appointment or reset a password. */
export const RECEPTION = "the clinic's reception";
