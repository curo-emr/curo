"use client";

import { useState } from "react";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { formatAgeSex } from "@curo/web/format";
import { SearchInput } from "@curo/web/ui/search-input";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { LoadError } from "@curo/web/ui/load-error";
import { Pagination } from "@curo/web/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { Loader2, Users } from "lucide-react";
import { getPatientsPaginated } from "@/lib/api/patients";

export function PatientList() {
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query);
  const { items: patients, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    (page, pageSize) => getPatientsPaginated({ page, pageSize, search: search || undefined }),
    [search],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name, MRN, NIC or phone…"
          className="flex-1 max-w-md"
        />
      </div>

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
            title={search ? "No patients match your search" : "No patients registered yet"}
            description={search ? "Check the spelling, or search by MRN, NIC or phone." : undefined}
            action={<Button asChild variant="outline" size="sm"><Link href={ROUTES.NEW_PATIENT}>Register patient</Link></Button>}
          />
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>NIC / PHN</TableHead>
                <TableHead>Age / Sex</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
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
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {patient.nic || (patient.phn ? `PHN ${patient.phn}` : "—")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatAgeSex(patient.dob, patient.sex)}</TableCell>
                  <TableCell className="text-muted-foreground">{patient.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(patient.registeredAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
