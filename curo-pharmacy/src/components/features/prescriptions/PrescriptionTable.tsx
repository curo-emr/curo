"use client";

import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight } from "lucide-react";
import { Prescription, Patient } from "@/types";
import { getPatientName, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface PrescriptionTableProps {
  prescriptions: Prescription[];
  patients: Patient[];
}

export function PrescriptionTable({ prescriptions, patients }: PrescriptionTableProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const sorted = useMemo(() => {
    return [...prescriptions].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }, [prescriptions]);

  const filtered = useMemo(() => {
    return sorted.filter(rx => {
      const q = query.toLowerCase().trim();
      if (q) {
        const patientName = getPatientName(rx.patientId, patients).toLowerCase();
        const matchesQuery =
          rx.prescriptionNumber.toLowerCase().includes(q) ||
          patientName.includes(q) ||
          rx.doctorName.toLowerCase().includes(q) ||
          rx.items.some(i => i.drugName.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (statusFilter !== "all" && rx.status !== statusFilter) return false;
      if (priorityFilter !== "all" && rx.priority !== priorityFilter) return false;
      return true;
    });
  }, [query, statusFilter, priorityFilter, sorted, patients]);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Rx number, patient, doctor, or medication..."
                className="pl-9 bg-muted border"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="dispensed">Dispensed</SelectItem>
                <SelectItem value="partially_dispensed">Partially Dispensed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="stat">STAT</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="routine">Routine</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {(query || statusFilter !== "all" || priorityFilter !== "all") && (
        <p className="text-sm text-muted-foreground px-1">
          {filtered.length} of {prescriptions.length} prescriptions shown
        </p>
      )}

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Rx Number</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map(rx => (
                <TableRow key={rx.id} className="hover:bg-muted/50 transition-colors group">
                  <TableCell className="font-mono text-sm font-medium">{rx.prescriptionNumber}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{getPatientName(rx.patientId, patients)}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{rx.doctorName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {rx.items.map(i => i.drugName).join(', ')}
                  </TableCell>
                  <TableCell><StatusBadge status={rx.status} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      rx.priority === 'stat' ? 'text-status-error-text border-status-error-border bg-status-error-bg' :
                      rx.priority === 'urgent' ? 'text-status-warning-text border-status-warning-border bg-status-warning-bg' :
                      'text-muted-foreground border bg-muted'
                    }>
                      {rx.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(rx.receivedAt)}</TableCell>
                  <TableCell>
                    <Link href={ROUTES.PRESCRIPTION(rx.id)}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary hover:bg-primary/10">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No prescriptions match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
