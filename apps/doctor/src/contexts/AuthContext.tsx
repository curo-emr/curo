"use client";

import type { ReactNode } from "react";
import { AuthProvider as SessionProvider, useAuth as useSession, type AuthUser } from "@curo/web/auth";
import { getPractitioners } from "@/lib/api/practitioners";
import { clearAllDrafts } from "@/lib/visit";

/** The signed-in doctor, with the profile fields the portal greets and labels them by. */
export interface DoctorUser extends AuthUser {
  firstName?: string;
  specialty?: string;
}

// The login payload carries the name but not first name or specialty — look the
// doctor up once and cache them.
async function withProfile(user: DoctorUser): Promise<DoctorUser> {
  if (user.firstName || !user.practitionerId) return user;
  try {
    const me = (await getPractitioners("DOCTOR")).find(p => p.id === user.practitionerId);
    return me ? { ...user, name: me.name.full, firstName: me.name.first, specialty: me.specialty } : user;
  } catch {
    return user;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider enrichUser={withProfile} onLogout={clearAllDrafts}>
      {children}
    </SessionProvider>
  );
}

export const useAuth = () => useSession<DoctorUser>();
