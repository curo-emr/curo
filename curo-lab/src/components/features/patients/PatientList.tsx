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
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, User } from "lucide-react";
import { Patient, LabOrder } from "@/types";
import { calculateAge, formatDate } from "@/lib/utils";
import Link from "next/link";

interface PatientListProps {
  patients: Patient[];
  orders: LabOrder[];
}

export function PatientList({ patients, orders }: PatientListProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    return patients.filter(p => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      return (
        p.name.full.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    });
  }, [query, patients]);

  const getPatientOrderInfo = (patientId: string) => {
    const patientOrders = orders.filter(o => o.patientId === patientId);
    const lastOrder = patientOrders.sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())[0];
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
              placeholder="Search by name, MRN, or phone..."
              className="pl-9 bg-muted border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {query && (
        <p className="text-sm text-muted-foreground px-1">
          {filtered.length} of {patients.length} patients shown
        </p>
      )}

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Age / Sex</TableHead>
              <TableHead>Blood Type</TableHead>
              <TableHead>Last Lab Order</TableHead>
              <TableHead>Total Orders</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map(patient => {
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
                    <TableCell className="text-muted-foreground font-medium">{patient.bloodType}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lastOrder ? formatDate(lastOrder.orderedAt) : '-'}
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
    </div>
  );
}
