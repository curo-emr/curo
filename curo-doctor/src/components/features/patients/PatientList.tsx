"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronRight, Search, Users } from "lucide-react";
import type { Allergy, Patient } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PatientAvatar } from "@/components/ui/PatientAvatar";
import { Pagination } from "@/components/ui/pagination";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROUTES } from "@/lib/constants";
import { formatAgeSex, formatDate } from "@/lib/utils";
import { getPatientsPaginated, getAllergies } from "@/lib/api/patients";

type SexFilter = "all" | "male" | "female" | "other";

export function PatientList() {
  const router = useRouter();
  const initialQuery = useSearchParams().get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [allergies, setAllergies] = useState<Record<string, Allergy[]>>({});
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box so each keystroke doesn't hit the backend; a new search starts at page 1.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getPatientsPaginated({
        page, pageSize,
        search: debouncedQuery || undefined,
        gender: sexFilter === "all" ? undefined : sexFilter,
      });
      // Allergies live on a separate endpoint — fetch only for the current page.
      const perPatient = await Promise.all(result.items.map(p => getAllergies(p.id).catch(() => [] as Allergy[])));
      if (!active) return;
      setAllergies(Object.fromEntries(result.items.map((p, i) => [p.id, perPatient[i]])));
      setPatients(result.items);
      setTotal(result.total);
      setError(null);
    })().catch(() => {
      if (!active) return;
      setError("Couldn't load patients. Check your connection and try again.");
      setPatients([]);
      setTotal(0);
    });
    return () => { active = false; };
  }, [page, pageSize, debouncedQuery, sexFilter]);

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
            onChange={e => setQuery(e.target.value)}
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
            {patients === null ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="px-5"><Skeleton className="h-9 w-full" /></TableCell>
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  <EmptyState icon={Users} title={error ?? "No patients found"} description={error ? undefined : "Try a different name, MRN or phone number."} />
                </TableCell>
              </TableRow>
            ) : (
              patients.map(p => {
                const list = allergies[p.id] ?? [];
                return (
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
                    <TableCell>
                      {list.length > 0 ? (
                        <span className="inline-flex max-w-48 items-center gap-1 truncate rounded-full border border-status-error-border bg-status-error-bg px-2 py-0.5 text-xs font-medium text-status-error-text"
                          title={list.map(a => a.substance).join(", ")}>
                          <AlertTriangle className="h-3 w-3 shrink-0" /> <span className="truncate">{list.map(a => a.substance).join(", ")}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">None known</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(p.updatedAt)}</TableCell>
                    <TableCell className="pr-4"><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={changePageSize} />
    </div>
  );
}
