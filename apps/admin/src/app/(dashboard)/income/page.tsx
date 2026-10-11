"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { formatMoney } from "@curo/web/format";
import { QueryContent, allOf } from "@curo/web/query";
import { BarList } from "@curo/web/ui/bar-list";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { Stat, StatStrip } from "@curo/web/ui/stat";
import type { PaymentTotals } from "@/lib/api/payments";
import { ROUTES } from "@/lib/constants";
import { paymentQueries, userQueries } from "@/lib/queries";
import type { AdminUser } from "@/types";

export default function IncomePage() {
  const income = allOf(useQuery(paymentQueries.totals()), useQuery(userQueries.byRole("RECEPTIONIST")));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Income" description="Visit payments collected at the front desk, by every receptionist." />
      <QueryContent query={income} what="income">
        {([totals, receptionists]) => <Income totals={totals} receptionists={receptionists} />}
      </QueryContent>
    </div>
  );
}

function Income({ totals, receptionists }: { totals: PaymentTotals; receptionists: AdminUser[] }) {
  const byPractitioner = new Map(receptionists.filter(u => u.practitionerId).map(u => [u.practitionerId, u]));
  const money = (amount: number) => formatMoney(amount, totals.currency);

  const bars = totals.byCollector.map(c => {
    const receptionist = c.collectedBy ? byPractitioner.get(c.collectedBy) : undefined;
    return {
      id: c.collectedBy ?? "unknown",
      label: receptionist?.name ?? "Unknown receptionist",
      value: c.total,
      display: `${money(c.total)} · ${c.count} payment${c.count === 1 ? "" : "s"}`,
      href: receptionist && ROUTES.USER(receptionist.id),
    };
  });

  return (
    <>
      <StatStrip className="lg:grid-cols-3">
        <Stat label="Collected" value={money(totals.total)} detail="Paid payments only" />
        <Stat label="Payments" value={String(totals.count)} />
        <Stat label="Average payment" value={totals.count ? money(totals.total / totals.count) : "—"} />
      </StatStrip>

      <SectionCard
        icon={Wallet}
        iconClassName="text-primary"
        title="By receptionist"
        description="Open a receptionist to see their payments and correct one."
      >
        {bars.length ? <BarList items={bars} /> : <EmptyState icon={Wallet} title="No income recorded yet" />}
      </SectionCard>
    </>
  );
}
