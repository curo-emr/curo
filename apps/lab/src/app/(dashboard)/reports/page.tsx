"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartColumn, ClipboardList, Gauge, type LucideIcon } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { BarList } from "@curo/web/ui/bar-list";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { StackedBar, StackedBarLegend, type BarSegment } from "@curo/web/ui/stacked-bar";
import { Stat, StatStrip } from "@curo/web/ui/stat";
import { statusLabel } from "@curo/web/ui/status-badge";
import type { LabOrderSummary } from "@/lib/api/lab";
import { PRIORITY_META } from "@/lib/orders";
import { orderQueries } from "@/lib/queries";
import { formatMinutes } from "@/lib/utils";

export default function ReportsPage() {
  const reports = allOf(useQuery(orderQueries.summary()), useQuery(orderQueries.turnaround()));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Reports" description="Every order sent to your lab, since it opened." />
      <QueryContent query={reports} what="the reports">
        {([summary, turnaround]) => <Reports summary={summary} turnaround={turnaround} />}
      </QueryContent>
    </div>
  );
}

interface ReportsProps {
  summary: LabOrderSummary;
  turnaround: { averageMinutes: number | null; count: number };
}

const STATUSES = [
  { status: "sent_to_lab", label: "To do", tone: "info" },
  { status: "completed", label: statusLabel("completed"), tone: "success" },
  { status: "draft", label: "Not sent, or taken back", tone: "neutral" },
] as const;

function Reports({ summary, turnaround }: ReportsProps) {
  const statuses: BarSegment[] = STATUSES.map(({ status, label, tone }) => ({ label, tone, count: summary.byStatus[status] ?? 0 }));
  const priorities: BarSegment[] = (Object.keys(PRIORITY_META) as (keyof typeof PRIORITY_META)[]).map(priority => ({
    ...PRIORITY_META[priority],
    count: summary.byPriority[priority] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <StatStrip>
        <Stat label="Orders" value={summary.total.toLocaleString()} />
        <Stat label="To do" value={(summary.byStatus.sent_to_lab ?? 0).toLocaleString()} />
        <Stat label="Completed" value={(summary.byStatus.completed ?? 0).toLocaleString()} />
        <Stat
          label="Average turnaround"
          value={turnaround.averageMinutes === null ? "—" : formatMinutes(turnaround.averageMinutes)}
          detail={turnaround.count ? `Sample received to results, ${turnaround.count} orders` : "No results reported yet"}
        />
      </StatStrip>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={ChartColumn} iconClassName="text-primary" title="Most ordered tests" description="Each test in a panel counts">
          {summary.topTests.length === 0 ? (
            <EmptyState title="No orders yet" className="py-6" />
          ) : (
            <BarList items={summary.topTests.map(t => ({ id: t.code, label: t.display, value: t.count }))} />
          )}
        </SectionCard>

        <div className="space-y-6">
          <BreakdownCard icon={ClipboardList} title="Orders by status" segments={statuses} />
          <BreakdownCard icon={Gauge} title="Orders by priority" segments={priorities} />
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({ icon, title, segments }: { icon: LucideIcon; title: string; segments: BarSegment[] }) {
  return (
    <SectionCard icon={icon} iconClassName="text-primary" title={title}>
      <div className="space-y-4">
        <StackedBar segments={segments} className="h-2.5" />
        <StackedBarLegend segments={segments} />
      </div>
    </SectionCard>
  );
}
