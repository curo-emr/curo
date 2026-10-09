"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { QueryContent, allOf } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import type { PaymentTotals } from "@/lib/api/payments";
import { paymentQueries, userQueries } from "@/lib/queries";
import type { AdminUser } from "@/types";

function money(amount: number, currency = "LKR") {
  const f = Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "LKR" ? `Rs. ${f}` : `${currency} ${f}`;
}

export default function IncomeOversightPage() {
  const income = allOf(useQuery(paymentQueries.totals()), useQuery(userQueries.byRole("RECEPTIONIST")));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Income oversight" description="Visit income collected across all receptionists." />

      <QueryContent query={income} what="income">
        {([totals, receptionists]) => <Income totals={totals} receptionists={receptionists} />}
      </QueryContent>
    </div>
  );
}

function Income({ totals, receptionists }: { totals: PaymentTotals; receptionists: AdminUser[] }) {
  const nameByPractitioner = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of receptionists) if (u.practitionerId) m.set(u.practitionerId, u.name);
    return m;
  }, [receptionists]);

  const byReceptionist = useMemo(
    () =>
      totals.byCollector.map((c) => ({
        name: (c.collectedBy && nameByPractitioner.get(c.collectedBy)) || "Unknown",
        total: c.total,
        count: c.count,
      })),
    [totals, nameByPractitioner],
  );

  const grandTotal = totals.total;

  return (
    <>
      <Card className="shadow-sm border">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">Total collected</p>
          <p className="text-2xl font-bold text-foreground">{money(grandTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totals?.count ?? 0} payments</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b pb-3"><CardTitle className="text-base">Income by receptionist</CardTitle></CardHeader>
        <CardContent className="p-5">
          {byReceptionist.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No income recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byReceptionist} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(value) => [money(Number(value)), "Income"]}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
                <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Open a receptionist from the Users page to view and correct individual payments.
      </p>
    </>
  );
}
