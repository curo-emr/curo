"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@curo/web/auth";
import { greeting } from "@curo/web/format";
import { QueryContent, allOf } from "@curo/web/query";
import { BenchWatch } from "@/components/features/dashboard/BenchWatch";
import { NextOrderCard } from "@/components/features/dashboard/NextOrderCard";
import { labQueries, orderQueries } from "@/lib/queries";

const QC_ALERT_LIMIT = 5;

// The one order to work on next, then what on the bench needs attention; the full
// list of orders is the worklist.
export default function DashboardPage() {
  const { user } = useAuth();
  const waiting = useQuery(orderQueries.page({ page: 1, pageSize: 1, status: "sent_to_lab", sort: "priority" }));
  const bench = allOf(useQuery(labQueries.qcAlerts(QC_ALERT_LIMIT)), useQuery(labQueries.instruments()));

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

      <QueryContent query={waiting} what="the orders waiting">
        {({ items, total }) => <NextOrderCard next={items[0]} waiting={total} />}
      </QueryContent>

      <QueryContent query={bench} what="the QC alerts and instruments">
        {([qcAlerts, instruments]) => <BenchWatch qcAlerts={qcAlerts} instruments={instruments} />}
      </QueryContent>
    </div>
  );
}
