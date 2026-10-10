import Link from "next/link";
import { ArrowRight, CalendarClock, Package, PackageCheck, TriangleAlert } from "lucide-react";
import { formatStatus } from "@curo/web/format";
import { Badge } from "@curo/web/ui/badge";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { SectionCard } from "@curo/web/ui/section-card";
import { StatusBadge, toneClass } from "@curo/web/ui/status-badge";
import type { GroupedStock } from "@/lib/api/pharmacy";
import { ROUTES } from "@/lib/constants";
import { EXPIRY_WARNING_DAYS, batchesToCheck, byUrgency, daysUntil, stockLevel } from "@/lib/stock";
import { formatDate } from "@/lib/utils";

/** Rows a card shows before pointing to the inventory for the rest. */
const MAX_ROWS = 5;

// What on the shelves needs the pharmacist: drugs to reorder, and batches to use up or take off.
export function StockWatch({ drugs }: { drugs: GroupedStock[] }) {
  const low = byUrgency(drugs.filter(d => d.low));
  const batches = batchesToCheck(drugs);

  if (drugs.length === 0) {
    return (
      <Card>
        <EmptyState icon={Package} title="No stock recorded" description="This pharmacy has no stock on its books yet." className="py-8" />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard icon={TriangleAlert} iconClassName="text-status-warning-text" title="Running low" count={low.length} noPadding>
        {low.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Nothing to reorder" description="Every drug is above its reorder level." className="py-8" />
        ) : (
          <WatchList more={low.length - MAX_ROWS}>
            {low.slice(0, MAX_ROWS).map(drug => (
              <WatchRow
                key={drug.medicationCode}
                title={drug.medicationName}
                detail={`${drug.usableQuantity} ${drug.unit} left · reorder at ${drug.reorderLevel}`}
                badge={<StatusBadge status={stockLevel(drug)} />}
              />
            ))}
          </WatchList>
        )}
      </SectionCard>

      <SectionCard icon={CalendarClock} iconClassName="text-status-warning-text" title="Expiring batches" count={batches.length} noPadding>
        {batches.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="No batches expiring"
            description={`Nothing on the shelf expires in the next ${EXPIRY_WARNING_DAYS} days.`}
            className="py-8"
          />
        ) : (
          <WatchList more={batches.length - MAX_ROWS}>
            {batches.slice(0, MAX_ROWS).map(({ drug, batch, state }) => (
              <WatchRow
                key={batch.id}
                title={drug.medicationName}
                detail={[batch.batchNumber && `Batch ${batch.batchNumber}`, `${batch.quantity} ${drug.unit}`, `expires ${formatDate(batch.expiryDate)}`]
                  .filter(Boolean)
                  .join(" · ")}
                badge={
                  <Badge variant="outline" className={toneClass(state === "expired" ? "error" : "warning")}>
                    {state === "expired" ? formatStatus(state) : `${daysUntil(batch.expiryDate)}d left`}
                  </Badge>
                }
              />
            ))}
          </WatchList>
        )}
      </SectionCard>
    </div>
  );
}

function WatchList({ more, children }: { more: number; children: React.ReactNode }) {
  return (
    <>
      <ul className="divide-y">{children}</ul>
      <Link
        href={ROUTES.INVENTORY}
        className="flex items-center justify-center gap-1 border-t px-5 py-2.5 text-sm font-medium text-primary hover:bg-muted/50"
      >
        {more > 0 ? `${more} more in the inventory` : "Open inventory"} <ArrowRight className="size-3.5" />
      </Link>
    </>
  );
}

function WatchRow({ title, detail, badge }: { title: string; detail: string; badge: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="shrink-0">{badge}</div>
    </li>
  );
}
