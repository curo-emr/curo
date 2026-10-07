import { FlaskConical } from "lucide-react";
import type { LabOrder } from "@/types";
import { SectionCard } from "@curo/web/ui/section-card";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { EmptyState } from "@curo/web/ui/empty-state";
import { formatDate } from "@/lib/utils";

export function LabsTab({ labOrders }: { labOrders: LabOrder[] }) {
  return (
    <SectionCard icon={FlaskConical} title="Lab orders" count={labOrders.length} noPadding>
      {labOrders.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No lab orders yet" description="Tests you order during a visit appear here." />
      ) : (
        <ul className="divide-y">
          {labOrders.map(lo => (
            <li key={lo.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-foreground">{lo.tests.map(t => t.display).join(", ") || "Lab order"}</p>
                <p className="text-xs text-muted-foreground">
                  Ordered {formatDate(lo.createdAt)}
                  {lo.notesToLab && <> · <span className="italic">{lo.notesToLab}</span></>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {lo.priority !== "routine" && (
                  <span className="rounded-full border border-status-error-border bg-status-error-bg px-2 py-0.5 text-xs font-medium uppercase text-status-error-text">
                    {lo.priority}
                  </span>
                )}
                <StatusBadge status={lo.status === "completed" ? "completed" : lo.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
