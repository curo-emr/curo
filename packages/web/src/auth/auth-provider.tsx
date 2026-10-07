"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../api/client";
import { clearSession, readStoredUser, storeTokens, storeUser, subscribeToSession } from "../session";

/** The user as the login response describes them. A portal may store more (see `enrichUser`). */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  patientId?: string | null;
  practitionerId?: string | null;
  name?: string;
}

export interface AuthContextValue<U extends AuthUser = AuthUser> {
  user: U | null;
  /** True until the stored session has been read (during the server render and hydration). */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps<U extends AuthUser> {
  children: ReactNode;
  /**
   * Adds what the login response lacks, such as the doctor's specialty. Runs at
   * login and once for a stored session without it; return the same object when
   * there is nothing to add. Pass a module-level function, not an inline one, so
   * it isn't called again on every render.
   */
  enrichUser?: (user: U) => Promise<U>;
  /** Runs on logout, before the session is cleared: say, to drop drafts kept in the browser. */
  onLogout?: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readServerUser = () => undefined;

export function AuthProvider<U extends AuthUser = AuthUser>({ children, enrichUser, onLogout }: AuthProviderProps<U>) {
  const user = useSyncExternalStore(subscribeToSession, readStoredUser, readServerUser) as U | null | undefined;
  const router = useRouter();

  useEffect(() => {
    if (!user || !enrichUser) return;
    void enrichUser(user).then((enriched) => {
      if (enriched !== user) storeUser(enriched);
    });
  }, [user, enrichUser]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string; user: U }>("/auth/login", {
      email,
      password,
    });
    // Tokens first: enrichUser may call the API as the new user.
    storeTokens(res.data.accessToken, res.data.refreshToken);
    storeUser(enrichUser ? await enrichUser(res.data.user) : res.data.user);
  };

  const logout = () => {
    onLogout?.();
    clearSession();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading: user === undefined, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** The session. `U` is the user type the provider's `enrichUser` produces; the default is the login response. */
export function useAuth<U extends AuthUser = AuthUser>(): AuthContextValue<U> {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx as AuthContextValue<U>;
}
