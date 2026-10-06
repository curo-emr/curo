"use client";

import React, { createContext, useContext, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  patientId?: string | null;
  practitionerId?: string | null;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "curo_access_token";
const REFRESH_KEY = "curo_refresh_token";
const USER_KEY = "curo_user";

// The session lives in localStorage, which React reads as an external store: the
// server render and hydration see `undefined` ("loading"), then the stored user.
// Writes go through `notifySession`; other tabs arrive as `storage` events.
const sessionListeners = new Set<() => void>();

function subscribeToSession(listener: () => void) {
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
let storedUser: AuthUser | null = null;

// Must return the same object until storage changes, so parse only on change.
function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(TOKEN_KEY) ? localStorage.getItem(USER_KEY) : null;
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

const readServerUser = () => undefined;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribeToSession, readStoredUser, readServerUser);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/auth/login", { email, password });

    const { accessToken, refreshToken, user: authUser } = res.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    notifySession();
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    notifySession();
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, isLoading: user === undefined, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
