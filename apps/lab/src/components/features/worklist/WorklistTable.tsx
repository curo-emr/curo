"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@curo/web/ui/input";
import { Card, CardContent } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { Search, Eye } from "lucide-react";
import { LabOrder, Patient } from "@/types";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { WorklistFilters } from "./WorklistFilters";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent to Lab", value: "sent_to_lab" },
  { label: "Results Pending", value: "results_pending" },
  { label: "Completed", value: "completed" },
];

interface WorklistTableProps {
  orders: LabOrder[];
  patients: Patient[];
}

export function WorklistTable({ orders, patients }: WorklistTableProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [statusTab, setStatusTab] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = query.toLowerCase().trim();
      const patient = patients.find(p => p.id === o.patientId);
      const matchesQuery = !q || (
        o.id.toLowerCase().includes(q) ||
        (patient?.name.full.toLowerCase().includes(q)) ||
        (patient?.mrn.toLowerCase().includes(q))
      );
      const matchesStatus = statusTab === "all" || o.status === statusTab;
      const matchesPriority = priorityFilter === "all" || o.priority === priorityFilter;
      return matchesQuery && matchesStatus && matchesPriority;
    }).sort((a, b) => {
      const priorityOrder = { stat: 0, urgent: 1, routine: 2 };
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [query, statusTab, priorityFilter, orders, patients]);

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

      {hasFilters && (
        <p className="text-sm text-muted-foreground px-1">
          {filtered.length} of {orders.length} orders shown
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
            {filtered.length > 0 ? (
              filtered.map(order => {
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
                      <StatusBadge status={order.status} />
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
    </div>
  );
}
