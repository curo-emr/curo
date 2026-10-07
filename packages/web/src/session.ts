// The signed-in session lives in localStorage: the API client sends and refreshes
// the tokens, and the auth provider reads the user. Every portal uses the same keys.
const ACCESS_TOKEN_KEY = "curo_access_token";
const REFRESH_TOKEN_KEY = "curo_refresh_token";
const USER_KEY = "curo_user";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function storeUser(user: unknown) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifySession();
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifySession();
}

// React reads the user as an external store (useSyncExternalStore). Writes in this
// tab notify through `notifySession`; other tabs arrive as `storage` events.
const sessionListeners = new Set<() => void>();

export function subscribeToSession(listener: () => void) {
  sessionListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    sessionListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notifySession() {
  sessionListeners.forEach((listener) => listener());
}

let storedRaw: string | null = null;
let storedUser: unknown = null;

/** The stored user, or null when signed out. The same object until storage changes. */
export function readStoredUser(): unknown {
  const raw = getAccessToken() ? localStorage.getItem(USER_KEY) : null;
  if (raw !== storedRaw) {
    storedRaw = raw;
    try {
      storedUser = raw ? JSON.parse(raw) : null;
    } catch {
      storedUser = null;
    }
  }
  return storedUser;
}
