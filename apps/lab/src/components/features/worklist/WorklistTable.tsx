"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { findPatientIds } from "@curo/web/api";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import { Input } from "@curo/web/ui/input";
import { Card, CardContent } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { Pagination } from "@curo/web/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { Search, Eye, Loader2 } from "lucide-react";
import type { LabOrder } from "@/types";
import { formatDate } from "@/lib/utils";
import { orderStatus } from "@/lib/order-status";
import { getLabOrderSummary, getLabOrdersPage } from "@/lib/api/lab";
import { getPatientsByIds } from "@/lib/api/patients";
import { StatusBadge, statusLabel } from "@curo/web/ui/status-badge";
import { WorklistFilters } from "./WorklistFilters";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

const STATUS_TABS: { label: string; value: LabOrder["status"] | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: statusLabel("sent_to_lab"), value: "sent_to_lab" },
  { label: statusLabel("results_pending"), value: "results_pending" },
  { label: "Completed", value: "completed" },
];

/** The lab's orders, stat first, paged and filtered on the server; `visit` narrows them to one visit. */
export function WorklistTable({ visit }: { visit?: string }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const search = useDebouncedValue(query).trim();
  const [statusTab, setStatusTab] = useState<LabOrder["status"] | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data, items: orders, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    async (page, pageSize) => {
      // Patient names live in the patient service: find the matching patients first.
      const matches = search ? await findPatientIds(search) : undefined;
      const [result, summary] = await Promise.all([
        getLabOrdersPage({
          page,
          pageSize,
          encounterId: visit,
          status: statusTab === "all" ? undefined : statusTab,
          priorities: priorityFilter === "all" ? undefined : [priorityFilter as LabOrder["priority"]],
          search,
          searchPatientIds: matches?.ids,
          sort: "priority",
        }),
        getLabOrderSummary(visit),
      ]);
      const patients = await getPatientsByIds(result.items.map(o => o.patientId));
      return { ...result, patients, summary, tooManyMatches: matches?.complete === false };
    },
    [search, statusTab, priorityFilter, visit],
  );
  const patients = data?.patients ?? [];
  const statusCounts: Partial<Record<string, number>> = { all: data?.summary.total, ...data?.summary.byStatus };

  const hasFilters = priorityFilter !== "all" || query !== "";

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex items-center gap-1 flex-wrap border-b pb-0">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusTab(tab.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {statusCounts[tab.value] ? (
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                {statusCounts[tab.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <Card className="shadow-sm border">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by order ID, patient name, or MRN..."
              className="pl-9 bg-muted border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <WorklistFilters
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            onClear={() => { setQuery(""); setPriorityFilter("all"); }}
            hasFilters={hasFilters}
          />
        </CardContent>
      </Card>

      {data?.tooManyMatches && (
        <p className="text-sm text-status-warning-text px-1">
          More than 100 patients match &ldquo;{search}&rdquo;, so only some of them are searched. Add more of the name, or the MRN.
        </p>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Tests</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-primary" />
                  Loading orders…
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-destructive">Failed to load orders.</TableCell>
              </TableRow>
            ) : orders.length > 0 ? (
              orders.map(order => {
                const patient = patients.find(p => p.id === order.patientId);
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50 transition-colors group">
                    <TableCell>
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        order.priority === 'stat' ? 'bg-destructive' :
                        order.priority === 'urgent' ? 'bg-status-warning-text' :
                        'bg-muted-foreground/30'
                      }`} title={order.priority} />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-foreground">{order.id.slice(0, 8).toUpperCase()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm">{patient?.name.full || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{patient?.mrn}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {order.tests.length} test{order.tests.length !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground capitalize">{order.priority}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={orderStatus(order)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link href={ROUTES.ORDER(order.id)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary hover:bg-primary/10">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground border-dashed">
                  No orders match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}
