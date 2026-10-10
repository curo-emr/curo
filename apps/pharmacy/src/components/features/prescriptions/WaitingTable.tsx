"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, SearchX } from "lucide-react";
import { useClientPagination } from "@curo/web/hooks";
import { formatAgeSex, formatRelative } from "@curo/web/format";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { Pagination } from "@curo/web/ui/pagination";
import { SearchInput } from "@curo/web/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { ROUTES } from "@/lib/constants";
import { medicineName, type WaitingPatient } from "@/lib/prescriptions";
import type { Patient } from "@/types";

interface WaitingTableProps {
  waiting: WaitingPatient[];
  patients: Patient[];
}

// Everyone with medicines waiting, longest wait first. Each medicine opens its own prescription;
// only the next patient's button is filled.
export function WaitingTable({ waiting, patients }: WaitingTableProps) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(patients.map(p => [p.id, p])), [patients]);

  // Searched here: names come from the patient service, prescriptions from the clinical one.
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return waiting;
    return waiting.filter(w => {
      const patient = byId.get(w.patientId);
      return [patient?.name.full, patient?.mrn, ...w.prescriptions.map(medicineName)].some(text => text?.toLowerCase().includes(q));
    });
  }, [waiting, byId, query]);

  const { page, setPage, pageSize, setPageSize, pageRows } = useClientPagination(filtered, [query]);

  if (waiting.length === 0) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <EmptyState
          icon={ClipboardCheck}
          title="No prescriptions waiting"
          description="Prescriptions appear here as soon as a doctor signs the visit."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by patient, MRN or medicine…" className="max-w-md" />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="No one waiting matches your search" description="Check the spelling, or search by MRN." />
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Medicines</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(w => {
                const patient = byId.get(w.patientId);
                const isNext = w === waiting[0];
                return (
                  <TableRow key={w.patientId}>
                    <TableCell>
                      <Link href={ROUTES.PATIENT(w.patientId)} className="group flex items-center gap-3">
                        <InitialsAvatar name={patient?.name.full ?? ""} size="sm" />
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground group-hover:text-primary">
                            {patient?.name.full ?? "Unknown patient"}
                          </span>
                          {patient && (
                            <span className="block text-xs text-muted-foreground">
                              {formatAgeSex(patient.dob, patient.sex)} · <span className="font-mono">{patient.mrn}</span>
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ul className="space-y-0.5">
                        {w.prescriptions.map(rx => (
                          <li key={rx.id}>
                            <Link href={ROUTES.PRESCRIPTION(rx.id)} className="text-sm text-foreground hover:text-primary hover:underline">
                              {medicineName(rx)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatRelative(w.since)}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant={isNext ? "default" : "outline"}>
                        <Link href={ROUTES.PRESCRIPTION(w.prescriptions[0].id)}>Dispense</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {filtered.length > 0 && (
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  );
}
