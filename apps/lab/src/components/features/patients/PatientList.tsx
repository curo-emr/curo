"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { formatAgeSex } from "@curo/web/format";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { LoadError } from "@curo/web/ui/load-error";
import { Pagination } from "@curo/web/ui/pagination";
import { SearchInput } from "@curo/web/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { getLabOrders } from "@/lib/api/lab";
import { getPatientsPaginated } from "@/lib/api/patients";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { LabOrder } from "@/types";

/** Each patient's orders at this lab: how many, and when the last one came. */
function ordersByPatient(orders: LabOrder[]) {
  const byPatient = new Map<string, { count: number; last: string }>();
  for (const order of orders) {
    const seen = byPatient.get(order.patientId);
    byPatient.set(order.patientId, {
      count: (seen?.count ?? 0) + 1,
      last: seen && seen.last > order.createdAt ? seen.last : order.createdAt,
    });
  }
  return byPatient;
}

export function PatientList() {
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query);
  const { data, items: patients, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    async (page, pageSize) => {
      const result = await getPatientsPaginated({ page, pageSize, search: search || undefined });
      // The lab-history columns: these patients' orders, not every order.
      const orders = await getLabOrders({ patientIds: result.items.map(p => p.id) });
      return { ...result, orders: ordersByPatient(orders) };
    },
    [search],
  );

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, MRN or PHN…" className="max-w-md" />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading patients…
          </div>
        ) : isError ? (
          <LoadError what="patients" />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "No patients match your search" : "No patients yet"}
            description={search ? "Check the spelling, or search by MRN or PHN." : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Age / Sex</TableHead>
                  <TableHead>PHN</TableHead>
                  <TableHead>Lab orders</TableHead>
                  <TableHead>Last order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map(patient => {
                  const orders = data?.orders.get(patient.id);
                  return (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <Link href={ROUTES.PATIENT(patient.id)} className="group flex items-center gap-3">
                          <InitialsAvatar name={patient.name.full} size="sm" />
                          <span className="min-w-0">
                            <span className="block font-medium text-foreground group-hover:text-primary">{patient.name.full}</span>
                            <span className="block font-mono text-xs text-muted-foreground">{patient.mrn}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatAgeSex(patient.dob, patient.sex)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{patient.phn || "—"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{orders?.count ?? 0}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{orders ? formatDate(orders.last) : "—"}</TableCell>
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
