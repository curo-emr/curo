import axios, { type InternalAxiosRequestConfig } from "axios";
import { clearSession, getAccessToken, getRefreshToken, storeTokens } from "../session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/** Calls the API gateway with the signed-in user's token, refreshing it once on a 401. */
export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Requests that got a 401 while a refresh was already running wait for its token.
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await axios.post<{ accessToken: string; refreshToken: string }>(`${API_BASE}/auth/refresh`, {
    refreshToken,
  });
  storeTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.accessToken;
}

// A full page load, not a router push: this runs outside React, and the reload
// drops every piece of the expired session's state. Replacing the history entry
// keeps Back from returning to a page that would only fail again.
function signOut() {
  clearSession();
  window.location.replace("/login");
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const request: (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined = error.config;
    if (error.response?.status !== 401 || !request || request._retry || typeof window === "undefined") {
      throw error;
    }
    // A 401 to a request sent without a session, such as signing in with the wrong
    // password, is the answer itself: there's nothing to refresh, and the sign-in
    // form shows the error.
    if (!request.headers.Authorization) throw error;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      signOut();
      throw error;
    }

    request._retry = true;
    try {
      refreshing ??= refreshAccessToken(refreshToken).finally(() => {
        refreshing = null;
      });
      request.headers.Authorization = `Bearer ${await refreshing}`;
    } catch (refreshError) {
      signOut();
      throw refreshError;
    }
    return apiClient(request);
  },
);
