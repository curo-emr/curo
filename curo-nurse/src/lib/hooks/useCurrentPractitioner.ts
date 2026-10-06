import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPractitioners, type Practitioner } from "@/lib/api/practitioners";

// The signed-in nurse's practitioner record (name, qualification) — null until loaded.
export function useCurrentPractitioner(): Practitioner | null {
  const { user } = useAuth();
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);

  useEffect(() => {
    if (!user?.practitionerId) return;
    let active = true;
    getPractitioners(user.role)
      .then(list => { if (active) setPractitioner(list.find(p => p.id === user.practitionerId) ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, [user?.practitionerId, user?.role]);

  return practitioner;
}
