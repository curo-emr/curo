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
import { LabOrder } from "@/types";
import { calculateAge, formatDate } from "@/lib/utils";
import { getPatientsPaginated } from "@/lib/api/patients";
import Link from "next/link";

interface PatientListProps {
  orders: LabOrder[];
}

export function PatientList({ orders }: PatientListProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const search = useDebouncedValue(query);
  const { items: patients, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    (page, pageSize) => getPatientsPaginated({ page, pageSize, search: search || undefined }),
    [search],
  );

  const getPatientOrderInfo = (patientId: string) => {
    const patientOrders = orders.filter(o => o.patientId === patientId);
    const lastOrder = [...patientOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return { count: patientOrders.length, lastOrder };
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
              <TableHead>PHN</TableHead>
              <TableHead>Last Lab Order</TableHead>
              <TableHead>Total Orders</TableHead>
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
                const { count, lastOrder } = getPatientOrderInfo(patient.id);
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
                    <TableCell className="text-muted-foreground font-mono text-xs">{patient.phn || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lastOrder ? formatDate(lastOrder.createdAt) : '-'}
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
