"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartColumn, Package } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { BarList } from "@curo/web/ui/bar-list";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { StackedBar, StackedBarLegend, type BarSegment } from "@curo/web/ui/stacked-bar";
import { Stat, StatStrip } from "@curo/web/ui/stat";
import { statusLabel } from "@curo/web/ui/status-badge";
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

  return (
    <div className="space-y-6">
      <StatStrip>
        <Stat label="Dispenses" value={dispensing.count.toLocaleString()} />
        <Stat label="Taken in" value={formatCurrency(dispensing.revenue)} />
        <Stat label="Prescriptions waiting" value={waiting.length.toLocaleString()} />
        <Stat label="Medicines to reorder" value={stock.filter(d => d.low).length.toLocaleString()} />
      </StatStrip>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={ChartColumn} iconClassName="text-primary" title="Most dispensed" description="By units handed over">
          {top.length === 0 ? (
            <EmptyState title="Nothing dispensed yet" className="py-6" />
          ) : (
            <BarList items={top.map(m => ({ label: m.name, value: m.quantity, display: `${m.quantity} units` }))} />
          )}
        </SectionCard>

        <SectionCard icon={Package} iconClassName="text-primary" title="Stock levels" description={`${stock.length} medicines stocked`}>
          {stock.length === 0 ? (
            <EmptyState title="No stock recorded" className="py-6" />
          ) : (
            <div className="space-y-4">
              <StackedBar segments={levels} className="h-2.5" />
              <StackedBarLegend segments={levels} />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
