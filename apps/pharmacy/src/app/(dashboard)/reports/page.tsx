"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartColumn, Package } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { StackedBar, type BarSegment } from "@curo/web/ui/stacked-bar";
import { statusLabel, toneDotClass } from "@curo/web/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import { dispensingQueries, prescriptionQueries, stockQueries } from "@/lib/queries";
import { stockLevel } from "@/lib/stock";
import type { DispenseSummary, GroupedStock } from "@/lib/api/pharmacy";
import type { Prescription } from "@/types";

export default function ReportsPage() {
  const reports = allOf(
    useQuery(dispensingQueries.summary()),
    useQuery(prescriptionQueries.pending()),
    useQuery(stockQueries.grouped()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Reports" description="This pharmacy's dispensing since it opened, and its stock today." />
      <QueryContent query={reports} what="the reports">
        {([dispensing, waiting, stock]) => <Reports dispensing={dispensing} waiting={waiting} stock={stock} />}
      </QueryContent>
    </div>
  );
}

interface ReportsProps {
  dispensing: DispenseSummary;
  waiting: Prescription[];
  stock: GroupedStock[];
}

const LEVELS = [
  { status: "in_stock", tone: "success" },
  { status: "low_stock", tone: "warning" },
  { status: "out_of_stock", tone: "error" },
] as const;

function Reports({ dispensing, waiting, stock }: ReportsProps) {
  const levels: BarSegment[] = LEVELS.map(({ status, tone }) => ({
    label: statusLabel(status),
    tone,
    count: stock.filter(d => stockLevel(d) === status).length,
  }));
  const top = dispensing.topMedications;
  const most = Math.max(1, ...top.map(m => m.quantity));

  return (
    <div className="space-y-6">
      <Card className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x">
        <Stat label="Dispenses" value={dispensing.count.toLocaleString()} />
        <Stat label="Taken in" value={formatCurrency(dispensing.revenue)} />
        <Stat label="Prescriptions waiting" value={waiting.length.toLocaleString()} />
        <Stat label="Medicines to reorder" value={stock.filter(d => d.low).length.toLocaleString()} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={ChartColumn} iconClassName="text-primary" title="Most dispensed" description="By units handed over">
          {top.length === 0 ? (
            <EmptyState title="Nothing dispensed yet" className="py-6" />
          ) : (
            <ul className="space-y-3">
              {top.map(m => (
                <li key={m.name}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-foreground">{m.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{m.quantity} units</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(m.quantity / most) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard icon={Package} iconClassName="text-primary" title="Stock levels" description={`${stock.length} medicines stocked`}>
          {stock.length === 0 ? (
            <EmptyState title="No stock recorded" className="py-6" />
          ) : (
            <div className="space-y-4">
              <StackedBar segments={levels} className="h-2.5" />
              <ul className="space-y-2">
                {levels.map(l => (
                  <li key={l.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <span className={`size-2 rounded-full ${toneDotClass(l.tone)}`} /> {l.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{l.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  );
}
