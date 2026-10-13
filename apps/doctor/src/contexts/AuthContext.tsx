"use client";

import type { ReactNode } from "react";
import { AuthProvider as SessionProvider, useAuth as useSession, type AuthUser } from "@curo/web/auth";
import { getPractitioners } from "@curo/web/practitioners";
import { clearAllDrafts } from "@/lib/visit";

/** The signed-in doctor, with the profile fields the portal greets and labels them by. */
export interface DoctorUser extends AuthUser {
  firstName?: string;
  specialization?: string;
}

// The login payload carries the name but not first name or specialization — look the
// doctor up once and cache them. Keyed on specialization, so a profile cached
// under an older shape is looked up again.
async function withProfile(user: DoctorUser): Promise<DoctorUser> {
  if (user.specialization !== undefined || !user.practitionerId) return user;
  try {
    const me = (await getPractitioners("DOCTOR")).find(p => p.id === user.practitionerId);
    return me ? { ...user, name: me.name.full, firstName: me.name.first, specialization: me.specialization } : user;
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
