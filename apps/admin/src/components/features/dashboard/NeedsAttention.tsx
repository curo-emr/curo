"use client";

import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ChevronRight, CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { allOf } from "@curo/web/query";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { LoadError } from "@curo/web/ui/load-error";
import { SectionCard } from "@curo/web/ui/section-card";
import { needsAttention } from "@/lib/attention";
import { ROLE_LABELS, ROUTES } from "@/lib/constants";
import { scheduleQueries, userQueries } from "@/lib/queries";

/** Staff who can't work until an admin sets something up, each a link to where it's fixed. */
export function NeedsAttention() {
  const staff = allOf(
    useQuery(userQueries.byRole("PHARMACIST")),
    useQuery(userQueries.byRole("LAB_STAFF")),
    useQuery(userQueries.byRole("DOCTOR")),
  );
  const doctorIds = staff.data?.[2].flatMap(d => (d.isActive && d.practitionerId ? [d.practitionerId] : [])) ?? [];
  const sessions = useQueries({
    queries: doctorIds.map(id => scheduleQueries.forDoctor(id)),
    combine: results => ({
      byDoctor: new Map(doctorIds.map((id, i) => [id, results[i].data])),
      pending: results.some(r => r.isPending),
    }),
  });

  const items = staff.data && !sessions.pending
    ? needsAttention(staff.data.flat(), id => sessions.byDoctor.get(id))
    : undefined;

  return (
    <SectionCard
      icon={CircleAlert}
      iconClassName="text-status-warning-text"
      title="Needs attention"
      description="Staff who can't work until you set something up."
      count={items?.length}
      noPadding
    >
      {staff.isError && !staff.data ? (
        <LoadError what="staff" onRetry={() => void staff.refetch()} retrying={staff.isFetching} />
      ) : !items ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Checking staff…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Nothing needs attention"
          description="Every pharmacist and lab staff member has a workplace, and every doctor has weekly sessions."
        />
      ) : (
        <ul className="divide-y">
          {items.map(({ user, reason }) => (
            <li key={user.id}>
              <Link href={ROUTES.USER(user.id)} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                <InitialsAvatar name={user.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {user.name} <span className="font-normal text-muted-foreground">· {ROLE_LABELS[user.role] ?? user.role}</span>
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{reason}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
