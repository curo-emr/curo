"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import { formatAgeSex } from "@curo/web/format";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { LoadError } from "@curo/web/ui/load-error";
import { Pagination } from "@curo/web/ui/pagination";
import { SearchInput } from "@curo/web/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { ROUTES } from "@/lib/constants";
import { formatAllergies, formatDate } from "@/lib/utils";
import { getAllergiesByPatient, getPatientsPaginated } from "@/lib/api/patients";
import { getPrescriptionSummaries } from "@/lib/api/pharmacy";

const Unavailable = () => <span className="text-muted-foreground">Unavailable</span>;

export function PatientList() {
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query);
  const { data, items: patients, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    async (page, pageSize) => {
      const result = await getPatientsPaginated({ page, pageSize, search: search || undefined });
      const ids = result.items.map(p => p.id);
      // null when a lookup failed: show "Unavailable", never "None known" or 0.
      const [allergies, rxSummaries] = await Promise.all([
        getAllergiesByPatient(ids).catch(() => null),
        getPrescriptionSummaries(ids).catch(() => null),
      ]);
      return { ...result, allergies, rxSummaries };
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
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Age / Sex</TableHead>
                <TableHead>Allergies</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead>Last prescribed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map(patient => {
                const rx = data?.rxSummaries?.get(patient.id);
                const allergies = data?.allergies?.get(patient.id);
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
                    <TableCell className="text-muted-foreground">{formatAgeSex(patient.dob, patient.sex)}</TableCell>
                    <TableCell className="text-sm">
                      {!allergies ? <Unavailable /> : allergies.length > 0 ? (
                        <span className="font-medium text-status-error-text">{formatAllergies(allergies)}</span>
                      ) : (
                        <span className="text-muted-foreground">None known</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {!rx ? <Unavailable /> : (
                        <span className={rx.pendingCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>{rx.pendingCount}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rx?.lastPrescribedAt ? formatDate(rx.lastPrescribedAt) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
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
