"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Loader2, SearchX } from "lucide-react";
import { findPatientIds } from "@curo/web/api";
import { formatRelative } from "@curo/web/format";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { LoadError } from "@curo/web/ui/load-error";
import { Pagination } from "@curo/web/ui/pagination";
import { SearchInput } from "@curo/web/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { PriorityBadge } from "@/components/features/orders/PriorityBadge";
import { getLabOrderSummary, getLabOrdersPage } from "@/lib/api/lab";
import { getPatientsByIds } from "@/lib/api/patients";
import { ROUTES } from "@/lib/constants";
import { STEP_ACTION, nextStep, orderNumber, orderStatus, PRIORITY_META } from "@/lib/orders";
import type { LabOrder } from "@/types";

// "To do" is every order the lab still owes results on, received or not; orders a
// doctor hasn't sent (or took back) only show under All.
const TABS = [
  { value: "sent_to_lab", label: "To do" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const PRIORITIES = Object.entries(PRIORITY_META) as [LabOrder["priority"], { label: string }][];

/** The lab's orders, stat first and then the longest waiting, paged and filtered on the server; `visit` narrows them to one visit. */
export function WorklistTable({ visit }: { visit?: string }) {
  const [tab, setTab] = useState<Tab>("sent_to_lab");
  const [priority, setPriority] = useState<LabOrder["priority"] | "all">("all");
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query).trim();

  const { data, items: orders, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    async (page, pageSize) => {
      // Patient names live in the patient service: find the matching patients first.
      const matches = search ? await findPatientIds(search) : undefined;
      const [result, summary] = await Promise.all([
        getLabOrdersPage({
          page,
          pageSize,
          encounterId: visit,
          status: tab === "all" ? undefined : tab,
          priorities: priority === "all" ? undefined : [priority],
          search,
          searchPatientIds: matches?.ids,
          sort: "priority",
        }),
        getLabOrderSummary(visit),
      ]);
      const patients = await getPatientsByIds(result.items.map(o => o.patientId));
      return { ...result, patients, summary, tooManyMatches: matches?.complete === false };
    },
    [search, tab, priority, visit],
  );
  const patients = new Map((data?.patients ?? []).map(p => [p.id, p]));
  const countOf = (value: Tab) => (value === "all" ? data?.summary.total : data?.summary.byStatus[value]);
  const filtered = priority !== "all" || search !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Tabs value={tab} onValueChange={value => setTab(value as Tab)}>
          <TabsList>
            {TABS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label}
                {!!countOf(value) && <span className="text-xs tabular-nums text-muted-foreground">{countOf(value)}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-1 items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Name, MRN or order no." className="min-w-0 flex-1" />
          <Select value={priority} onValueChange={value => setPriority(value as typeof priority)}>
            <SelectTrigger className="w-36 shrink-0" aria-label="Priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any priority</SelectItem>
              {PRIORITIES.map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data?.tooManyMatches && (
        <p className="px-1 text-sm text-status-warning-text">
          More than 100 patients match &ldquo;{search}&rdquo;, so only some of them are searched. Add more of the name, or the MRN.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading orders…
          </div>
        ) : isError ? (
          <LoadError what="the orders" />
        ) : orders.length === 0 ? (
          filtered ? (
            <EmptyState icon={SearchX} title="No orders match" description="Try another name or order number, or any priority." />
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title={tab === "sent_to_lab" ? "Nothing to do" : "No orders here"}
              description={tab === "sent_to_lab" ? "Orders appear here as soon as a doctor sends them to your lab." : undefined}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => {
                  const patient = patients.get(order.patientId);
                  const step = nextStep(order);
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={ROUTES.ORDER(order.id)} className="group block">
                          <span className="block font-medium text-foreground group-hover:text-primary">{patient?.name.full ?? "Unknown patient"}</span>
                          <span className="block font-mono text-xs text-muted-foreground">
                            {orderNumber(order)}{patient && ` · ${patient.mrn}`}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={order.tests.map(t => t.name).join(", ")}>
                        {order.tests.map(t => t.name).join(", ")}
                      </TableCell>
                      <TableCell><PriorityBadge priority={order.priority} /></TableCell>
                      <TableCell><StatusBadge status={orderStatus(order)} /></TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatRelative(order.sentToLabAt ?? order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="outline" size="sm">
                          <Link href={step ? STEP_ACTION[step].href(order.id) : ROUTES.ORDER(order.id)}>
                            {step ? STEP_ACTION[step].label : "View"}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {total > 0 && (
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  );
}
