"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronRight, Search, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@curo/web/hooks";
import { Card } from "@curo/web/ui/card";
import { Input } from "@curo/web/ui/input";
import { Skeleton } from "@curo/web/ui/skeleton";
import { EmptyState } from "@curo/web/ui/empty-state";
import { LoadError } from "@curo/web/ui/load-error";
import { PatientAvatar } from "@/components/ui/PatientAvatar";
import { Pagination } from "@curo/web/ui/pagination";
import { ToggleGroup, ToggleGroupItem } from "@curo/web/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { ROUTES } from "@/lib/constants";
import { formatAgeSex, formatDate } from "@/lib/utils";
import { patientQueries } from "@/lib/queries";
import { usePatientAllergies } from "./AllergyChips";

type SexFilter = "all" | "male" | "female" | "other";

export function PatientList() {
  const router = useRouter();
  const initialQuery = useSearchParams().get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // The search waits until typing pauses, so each keystroke doesn't hit the backend.
  const search = useDebouncedValue(query);
  const result = useQuery(patientQueries.page({
    page, pageSize,
    search: search || undefined,
    gender: sexFilter === "all" ? undefined : sexFilter,
  }));
  const patients = result.data?.items;

  // A new search or filter starts at page 1.
  const changeQuery = (value: string) => { setQuery(value); setPage(1); };
  const changeSex = (value: string) => { if (value) { setSexFilter(value as SexFilter); setPage(1); } };
  const changePageSize = (size: number) => { setPageSize(size); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, MRN, phone or NIC…"
            className="h-10 bg-card pl-9"
            value={query}
            onChange={e => changeQuery(e.target.value)}
          />
        </div>
        <ToggleGroup type="single" variant="outline" value={sexFilter} onValueChange={changeSex} className="bg-card">
          <ToggleGroupItem value="all" className="px-3">All</ToggleGroupItem>
          <ToggleGroupItem value="female" className="px-3">Female</ToggleGroupItem>
          <ToggleGroupItem value="male" className="px-3">Male</ToggleGroupItem>
          <ToggleGroupItem value="other" className="px-3">Other</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-5">Patient</TableHead>
              <TableHead>Age / sex</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead>Allergies</TableHead>
              <TableHead className="hidden lg:table-cell">Updated</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!patients && result.isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  <LoadError what="patients" onRetry={() => void result.refetch()} retrying={result.isFetching} />
                </TableCell>
              </TableRow>
            ) : !patients ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="px-5"><Skeleton className="h-9 w-full" /></TableCell>
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  <EmptyState icon={Users} title="No patients found" description="Try a different name, MRN or phone number." />
                </TableCell>
              </TableRow>
            ) : (
              patients.map(p => (
                <TableRow key={p.id} className="group cursor-pointer" onClick={() => router.push(ROUTES.PATIENT(p.id))}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <PatientAvatar name={p.name.full} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground group-hover:text-primary">{p.name.full}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.mrn}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatAgeSex(p.dob, p.sex)}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{p.phone || "—"}</TableCell>
                  <TableCell><AllergyCell patientId={p.id} /></TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(p.updatedAt)}</TableCell>
                  <TableCell className="pr-4"><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} pageSize={pageSize} total={result.data?.total ?? 0} onPageChange={setPage} onPageSizeChange={changePageSize} />
    </div>
  );
}

// The same allergies query as the chart, so opening the patient shows them at once.
function AllergyCell({ patientId }: { patientId: string }) {
  const allergies = usePatientAllergies(patientId);
  if (allergies === undefined) return <Skeleton className="h-5 w-20" />;
  if (allergies === null) return <span className="text-xs font-medium text-status-warning-text">Couldn&apos;t load</span>;
  if (allergies.length === 0) return <span className="text-xs text-muted-foreground">None known</span>;
  const names = allergies.map(a => a.substance).join(", ");
  return (
    <span className="inline-flex max-w-48 items-center gap-1 truncate rounded-full border border-status-error-border bg-status-error-bg px-2 py-0.5 text-xs font-medium text-status-error-text" title={names}>
      <AlertTriangle className="h-3 w-3 shrink-0" /> <span className="truncate">{names}</span>
    </span>
  );
}
