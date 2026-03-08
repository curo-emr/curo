"use client";

import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { DispensingRecord, Patient, PharmacyStaff } from "@/types";
import { getPatientName, getStaffName, formatDateTime, formatCurrency } from "@/lib/utils";

interface DispensingLogTableProps {
  records: DispensingRecord[];
  patients: Patient[];
  staff: PharmacyStaff[];
}

export function DispensingLogTable({ records, patients, staff }: DispensingLogTableProps) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => new Date(b.dispensedAt).getTime() - new Date(a.dispensedAt).getTime());
  }, [records]);

  const filtered = useMemo(() => {
    return sorted.filter(record => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      const patientName = getPatientName(record.patientId, patients).toLowerCase();
      const dispenserName = getStaffName(record.dispensedBy, staff).toLowerCase();
      return (
        record.prescriptionId.toLowerCase().includes(q) ||
        patientName.includes(q) ||
        dispenserName.includes(q) ||
        record.items.some(i => i.drugNameDispensed.toLowerCase().includes(q))
      );
    });
  }, [query, sorted, patients, staff]);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by patient, prescription, medication, or staff..."
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
              <TableHead>Substitutions</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map(record => {
                const hasSubstitution = record.items.some(i => i.substitution);
                return (
                  <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-sm font-medium">{record.id.toUpperCase()}</TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{getPatientName(record.patientId, patients)}</p>
                      <p className="text-xs text-muted-foreground">{record.prescriptionId.replace('rx_', 'RX-')}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                      {record.items.map(i => (
                        <div key={i.prescriptionItemId} className="truncate">
                          {i.drugNameDispensed} <span className="text-xs">x{i.quantityDispensed}</span>
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getStaffName(record.dispensedBy, staff)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(record.dispensedAt)}</TableCell>
                    <TableCell>
                      {hasSubstitution ? (
                        <Badge variant="outline" className="bg-status-purple-bg text-status-purple-text border-status-purple-border">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{formatCurrency(record.totalAmount)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No dispensing records match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
