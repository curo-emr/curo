"use client";

import { useState, useMemo } from "react";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

  const sorted = useMemo(() => {
    return [...prescriptions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [prescriptions]);

  const filtered = useMemo(() => {
    return sorted.filter(rx => {
      const q = query.toLowerCase().trim();
      if (q) {
        const patientName = getPatientName(rx.patientId, patients).toLowerCase();
        const matchesQuery =
          rx.id.toLowerCase().includes(q) ||
          patientName.includes(q) ||
          rx.items.some(i => i.displayName.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (statusFilter !== "all" && rx.status !== statusFilter) return false;
      return true;
    });
  }, [query, statusFilter, sorted, patients]);

  // Client-side pagination over the filtered set (search joins patient names from
  // a separate service, so it can't be pushed server-side).
  const { page, setPage, pageSize, setPageSize, pageRows: paged } =
    useClientPagination(filtered, [query, statusFilter]);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Rx ID, patient, or medication..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent_to_pharmacy">Sent to Pharmacy</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {(query || statusFilter !== "all") && (
        <p className="text-sm text-muted-foreground px-1">
          {filtered.length} of {prescriptions.length} prescriptions shown
        </p>
      )}

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Rx ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              paged.map(rx => (
                <TableRow key={rx.id} className="hover:bg-muted/50 transition-colors group">
                  <TableCell className="font-mono text-sm font-medium">{rx.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{getPatientName(rx.patientId, patients)}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {rx.items.map(i => i.displayName).join(', ')}
                  </TableCell>
                  <TableCell><StatusBadge status={rx.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(rx.createdAt)}</TableCell>
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
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No prescriptions match your filters.
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
