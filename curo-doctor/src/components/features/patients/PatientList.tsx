"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Search, ChevronRight, User, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { Patient, Allergy } from "@/types";
import { calculateAge, formatDate } from "@/lib/utils";
import { getPatientsPaginated, getAllergies } from "@/lib/api/patients";
import Link from "next/link";

type SexFilter = "all" | "male" | "female" | "other";

const SEX_FILTERS: { label: string; value: SexFilter }[] = [
  { label: "All", value: "all" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

export function PatientList() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [allergyMap, setAllergyMap] = useState<Record<string, Allergy>>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box so each keystroke doesn't hit the backend.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Any filter/page-size change resets to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sexFilter, pageSize]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPatientsPaginated({
        page,
        pageSize,
        search: debouncedQuery || undefined,
        gender: sexFilter === "all" ? undefined : sexFilter,
      });
      // Allergies live on a separate endpoint — fetch only for the current page.
      const perPatient = await Promise.all(
        result.items.map((p) => getAllergies(p.id).catch(() => [] as Allergy[])),
      );
      const map: Record<string, Allergy> = {};
      const enriched = result.items.map((p, i) => {
        for (const a of perPatient[i]) map[a.id] = a;
        return { ...p, allergies: perPatient[i].map((a) => a.id) };
      });
      setPatients(enriched);
      setAllergyMap(map);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setError("Failed to load patients.");
      setPatients([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedQuery, sexFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <Card className="shadow-sm border">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, MRN, phone, or NIC..."
              className="pl-9 bg-muted border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Sex:</span>
            {SEX_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={sexFilter === f.value ? "default" : "outline"}
                size="sm"
                className={
                  sexFilter === f.value
                    ? "h-7 text-xs bg-primary hover:bg-primary/90"
                    : "h-7 text-xs text-muted-foreground border hover:bg-muted"
                }
                onClick={() => setSexFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
            {(query || sexFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => { setQuery(""); setSexFilter("all"); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Age / Sex</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Allergies</TableHead>
              <TableHead>Last Seen</TableHead>
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
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-muted/50 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col max-w-[160px] sm:max-w-[250px]">
                        <Tooltip>
                          <TooltipTrigger className="cursor-default text-left truncate font-medium text-foreground group-hover:text-primary transition-colors">
                            {patient.name.full}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{patient.name.full}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-muted-foreground truncate">{patient.mrn}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {calculateAge(patient.dob)}y • {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{patient.phone}</TableCell>
                  <TableCell>
                    {patient.allergies.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default w-fit">
                            <Badge variant="destructive" className="bg-status-error-bg text-status-error-text text-xs font-medium border-status-error-border hover:bg-status-error-bg flex items-center gap-1.5 px-2.5 py-0.5">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {patient.allergies.length} {patient.allergies.length === 1 ? 'Allergy' : 'Allergies'}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-3">
                          <p className="font-semibold text-xs mb-2 text-foreground">Allergies for {patient.name.first}</p>
                          <ul className="text-xs space-y-1.5">
                            {patient.allergies.map((id) => {
                              const alg = allergyMap[id];
                              if (!alg) return null;
                              return (
                                <li key={id} className="flex items-center gap-2 leading-tight">
                                  <div className="h-1 w-1 rounded-full bg-status-error-text shrink-0" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{alg.substance}</span>
                                    {alg.reaction && <span className="text-[10px] text-muted-foreground">{alg.reaction}</span>}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="secondary" className="bg-status-success-bg text-status-success-text text-xs font-medium border-status-success-border hover:bg-status-success-bg flex items-center gap-1.5 w-fit px-2.5 py-0.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        None
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(patient.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/patients/${patient.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary hover:bg-primary/10">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground border-dashed">
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
