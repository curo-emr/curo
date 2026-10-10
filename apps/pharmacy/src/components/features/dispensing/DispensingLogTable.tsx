"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ReceiptText } from "lucide-react";
import { findPatientIds } from "@curo/web/api";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import { EmptyState } from "@curo/web/ui/empty-state";
import { LoadError } from "@curo/web/ui/load-error";
import { Pagination } from "@curo/web/ui/pagination";
import { SearchInput } from "@curo/web/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { ROUTES } from "@/lib/constants";
import { getDispensingRecordsPage } from "@/lib/api/pharmacy";
import { getPatientsByIds } from "@/lib/api/patients";
import { getPatientName, formatDateTime, formatCurrency } from "@/lib/utils";

/** This pharmacy's dispenses, latest first, paged and searched on the server. */
export function DispensingLogTable() {
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query).trim();

  const { data, items: records, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    async (page, pageSize) => {
      // Patient names live in the patient service: find the matching patients first.
      const matches = search ? await findPatientIds(search) : undefined;
      const result = await getDispensingRecordsPage({ page, pageSize, search, searchPatientIds: matches?.ids });
      const patients = await getPatientsByIds(result.items.map(r => r.patientId));
      return { ...result, patients, tooManyMatches: matches?.complete === false };
    },
    [search],
  );
  const patients = data?.patients ?? [];

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by patient, medicine or prescription…" className="max-w-md" />

      {data?.tooManyMatches && (
        <p className="px-1 text-sm text-status-warning-text">
          More than 100 patients match &ldquo;{search}&rdquo;, so only some of them are searched. Add more of the name, or the MRN.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading the dispensing log…
          </div>
        ) : isError ? (
          <LoadError what="the dispensing log" />
        ) : records.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={search ? "No dispenses match your search" : "Nothing dispensed yet"}
            description={search ? "Check the spelling, or search by MRN." : "Every dispense from this pharmacy is recorded here."}
          />
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Dispensed</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Medicines</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="whitespace-nowrap">
                    <span className="block text-sm text-foreground">{formatDateTime(record.dispensedAt)}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{record.receiptNumber}</span>
                  </TableCell>
                  <TableCell>
                    <Link href={ROUTES.PATIENT(record.patientId)} className="font-medium text-foreground hover:text-primary">
                      {getPatientName(record.patientId, patients)}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[250px] text-sm text-muted-foreground">
                    {record.items.map((i, idx) => (
                      <Link key={idx} href={ROUTES.PRESCRIPTION(record.prescriptionId)} className="block truncate hover:text-primary">
                        {i.medicationName} <span className="text-xs tabular-nums">×{i.quantity}</span>
                      </Link>
                    ))}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.dispensedBy}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-foreground">{formatCurrency(record.totalAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {total > 0 && (
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  );
}
