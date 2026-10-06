"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Search, ChevronRight, User, Loader2 } from "lucide-react";
import { Patient, Prescription } from "@/types";
import { calculateAge, formatDate } from "@/lib/utils";
import { getPatientsPaginated } from "@/lib/api/patients";
import Link from "next/link";

interface PatientListProps {
  prescriptions: Prescription[];
}

export function PatientList({ prescriptions }: PatientListProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, pageSize]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPatientsPaginated({ page, pageSize, search: debouncedQuery || undefined });
      setPatients(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setError("Failed to load patients.");
      setPatients([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedQuery]);

  useEffect(() => { load(); }, [load]);

  const getPatientRxInfo = (patientId: string) => {
    const patientRx = prescriptions.filter(rx => rx.patientId === patientId);
    const lastRx = [...patientRx].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return { count: patientRx.length, lastRx };
  };

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
              <TableHead>Last Prescription</TableHead>
              <TableHead>Total Rx</TableHead>
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
                <TableCell colSpan={6} className="h-32 text-center text-destructive">{error}</TableCell>
              </TableRow>
            ) : patients.length > 0 ? (
              patients.map(patient => {
                const { count, lastRx } = getPatientRxInfo(patient.id);
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
                      {patient.allergies.length > 0 ? (
                        <span className="text-status-error-text font-medium">{patient.allergies.join(', ')}</span>
                      ) : (
                        <span className="text-muted-foreground">None known</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lastRx ? formatDate(lastRx.createdAt) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{count}</TableCell>
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
