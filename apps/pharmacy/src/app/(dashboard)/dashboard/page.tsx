"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@curo/web/auth";
import { greeting } from "@curo/web/format";
import { QueryContent } from "@curo/web/query";
import { NextToDispenseCard } from "@/components/features/dashboard/NextToDispenseCard";
import { StockWatch } from "@/components/features/dashboard/StockWatch";
import { waitingByPatient } from "@/lib/prescriptions";
import { prescriptionQueries, stockQueries } from "@/lib/queries";

// The one patient to serve next, then what on the shelves needs attention; the full
// list of waiting prescriptions is the prescriptions page.
export default function DashboardPage() {
  const { user } = useAuth();
  const pending = useQuery(prescriptionQueries.pending());
  const stock = useQuery(stockQueries.grouped());

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{today}</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      <QueryContent query={pending} what="the prescriptions waiting">
        {rxs => <NextToDispenseCard waiting={waitingByPatient(rxs)} />}
      </QueryContent>

      <QueryContent query={stock} what="the stock">
        {drugs => <StockWatch drugs={drugs} />}
      </QueryContent>
    </div>
  );
}
