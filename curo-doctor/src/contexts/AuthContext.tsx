"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { getPractitioners } from "@/lib/api/practitioners";
import { clearAllDrafts } from "@/lib/visit";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  patientId?: string | null;
  practitionerId?: string | null;
  name?: string;
  firstName?: string;
  specialty?: string;
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

// The login payload carries no display name — look the doctor up once and cache it.
async function withProfile(user: AuthUser): Promise<AuthUser> {
  if (user.name || !user.practitionerId) return user;
  try {
    const me = (await getPractitioners("DOCTOR")).find(p => p.id === user.practitionerId);
    return me ? { ...user, name: me.name.full, firstName: me.name.first, specialty: me.specialty } : user;
  } catch {
    return user;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (stored && token) {
      try {
        const restored: AuthUser = JSON.parse(stored);
        setUser(restored);
        // Older sessions were cached before the profile lookup existed.
        if (!restored.name) {
          withProfile(restored).then(enriched => {
            localStorage.setItem(USER_KEY, JSON.stringify(enriched));
            setUser(enriched);
          });
        }
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/auth/login", { email, password });

    const { accessToken, refreshToken } = res.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    const authUser = await withProfile(res.data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    clearAllDrafts();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
