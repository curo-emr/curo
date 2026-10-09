"use client";

import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth";
import { cn } from "../ui/utils";
import { workplaceQueries } from "./workplace";

interface WorkplaceBadgeProps {
  icon: LucideIcon;
  /** What kind of place it is, as in "pharmacy" or "lab". */
  kind: string;
}

/** The place the signed-in user works at, which everything they see and do is for. */
export function WorkplaceBadge({ icon: Icon, kind }: WorkplaceBadgeProps) {
  const { user } = useAuth();
  // undefined while loading (or if it couldn't be), null when they work nowhere.
  const workplace = useQuery({ ...workplaceQueries.mine(), enabled: !!user }).data;

  if (workplace === undefined) return null;
  const unassigned = workplace === null;
  return (
    <div
      title={unassigned ? `Ask an administrator to assign you to a ${kind}` : `The ${kind} you are working at`}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        unassigned ? "border-amber-200 bg-amber-50 text-amber-800" : "border-primary/20 bg-primary/5 text-primary",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{unassigned ? `No ${kind} assigned` : workplace.name}</span>
    </div>
  );
}
