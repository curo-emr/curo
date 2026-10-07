"use client";

import { useState } from "react";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import { useSearchParams } from "next/navigation";
import { Input } from "@curo/web/ui/input";
import { Card, CardContent } from "@curo/web/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { Button } from "@curo/web/ui/button";
import { Pagination } from "@curo/web/ui/pagination";
import { Search, ChevronRight, User, Loader2 } from "lucide-react";
import { calculateAge, formatAllergies, formatDate } from "@/lib/utils";
import { getAllergiesByPatient, getPatientsPaginated } from "@/lib/api/patients";
import { getPrescriptionSummaries } from "@/lib/api/pharmacy";
import Link from "next/link";

export function PatientList() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
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
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, MRN, or PHN..."
              className="pl-9 bg-muted border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Age / Sex</TableHead>
              <TableHead>Allergies</TableHead>
              <TableHead>Pending Rx</TableHead>
              <TableHead>Last Prescribed</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-primary" />
                  Loading patients…
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-destructive">Failed to load patients.</TableCell>
              </TableRow>
            ) : patients.length > 0 ? (
              patients.map(patient => {
                const rx = data?.rxSummaries?.get(patient.id);
                const patientAllergies = data?.allergies?.get(patient.id);
                return (
                  <TableRow key={patient.id} className="hover:bg-muted/50 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{patient.name.full}</p>
                          <p className="text-xs text-muted-foreground">{patient.mrn}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {calculateAge(patient.dob)}y / {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {!patientAllergies ? (
                        <span className="text-muted-foreground">Unavailable</span>
                      ) : patientAllergies.length > 0 ? (
                        <span className="text-status-error-text font-medium">{formatAllergies(patientAllergies)}</span>
                      ) : (
                        <span className="text-muted-foreground">None known</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {!rx ? (
                        <span className="text-muted-foreground">Unavailable</span>
                      ) : rx.pendingCount > 0 ? (
                        <span className="font-medium text-foreground">{rx.pendingCount}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {rx?.lastPrescribedAt ? formatDate(rx.lastPrescribedAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary hover:bg-primary/10">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No patients match your search.
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
