"use client";

import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getMyWorkplace, type Organization } from "@/lib/api/organizations";

/** The lab the signed-in technician works at: they see only the tests sent to it. */
export function WorkplaceBadge() {
  const { user } = useAuth();
  // undefined while loading, null when they have no lab.
  const [workplace, setWorkplace] = useState<Organization | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    getMyWorkplace().then(setWorkplace, () => setWorkplace(undefined));
  }, [user]);

  if (workplace === undefined) return null;
  const unassigned = workplace === null;
  return (
    <div
      title={unassigned ? "Ask an administrator to assign you to a lab" : "The lab you are working at"}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        unassigned ? "border-amber-200 bg-amber-50 text-amber-800" : "border-primary/20 bg-primary/5 text-primary",
      )}
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{unassigned ? "No lab assigned" : workplace.name}</span>
    </div>
  );
}
