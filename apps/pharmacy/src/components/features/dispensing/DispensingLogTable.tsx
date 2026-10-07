"use client";

import { useState, useMemo } from "react";
import { useClientPagination } from "@curo/web/hooks";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import type { DispenseRecord } from "@/lib/api/pharmacy";
import { Patient, PharmacyStaff } from "@/types";
import { getPatientName, formatDateTime, formatCurrency } from "@/lib/utils";

interface DispensingLogTableProps {
  records: DispenseRecord[];
  patients: Patient[];
  staff: PharmacyStaff[];
}

export function DispensingLogTable({ records, patients }: DispensingLogTableProps) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => new Date(b.dispensedAt).getTime() - new Date(a.dispensedAt).getTime());
  }, [records]);

  const filtered = useMemo(() => {
    return sorted.filter(record => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      const patientName = getPatientName(record.patientId, patients).toLowerCase();
      return (
        record.prescriptionId.toLowerCase().includes(q) ||
        patientName.includes(q) ||
        record.items.some(i => i.medicationName.toLowerCase().includes(q))
      );
    });
  }, [query, sorted, patients]);

  // Client-side pagination over the filtered set (search joins patient names from
  // a separate service, so it can't be pushed server-side).
  const { page, setPage, pageSize, setPageSize, pageRows: paged } =
    useClientPagination(filtered, [query]);

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

      {query && (
        <p className="text-sm text-muted-foreground px-1">
          {filtered.length} of {records.length} records shown
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
            {filtered.length > 0 ? (
              paged.map(record => (
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
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
