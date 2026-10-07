"use client";

import { useState } from "react";
import { findPatientIds } from "@curo/web/api";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import { Input } from "@curo/web/ui/input";
import { Pagination } from "@curo/web/ui/pagination";
import { Card, CardContent } from "@curo/web/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { Loader2, Search } from "lucide-react";
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
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by patient, prescription, or medication..."
              className="pl-9 bg-muted border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {data?.tooManyMatches && (
        <p className="text-sm text-status-warning-text px-1">
          More than 100 patients match &ldquo;{search}&rdquo;, so only some of them are searched. Add more of the name, or the MRN.
        </p>
      )}

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Dispensing ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Medications</TableHead>
              <TableHead>Dispensed By</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-primary" />
                  Loading dispensing records…
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-destructive">Failed to load dispensing records.</TableCell>
              </TableRow>
            ) : records.length > 0 ? (
              records.map(record => (
                <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-sm font-medium">{record.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{getPatientName(record.patientId, patients)}</p>
                    <p className="text-xs text-muted-foreground">{record.prescriptionId.slice(0, 8).toUpperCase()}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                    {record.items.map((i, idx) => (
                      <div key={idx} className="truncate">
                        {i.medicationName} <span className="text-xs">x{i.quantity}</span>
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {record.dispensedBy}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateTime(record.dispensedAt)}</TableCell>
                  <TableCell className="font-medium text-foreground">{formatCurrency(record.totalAmount)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No dispensing records match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
