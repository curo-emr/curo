"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Patient, Allergy } from "@/types";
import { ROUTES } from "@/lib/constants";
import { calculateAge, formatDate } from "@/lib/utils";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";

interface PatientListProps {
  patients: Patient[];
  allergies: Allergy[];
}

export function PatientList({ patients, allergies }: PatientListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return patients;

    return patients.filter((p) => {
      return (
        p.name.full.toLowerCase().includes(q) ||
        p.nic.toLowerCase().includes(q) ||
        (p.phn ?? "").toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    });
  }, [query, patients]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name, NIC, MRN, or phone..."
          className="flex-1 max-w-md"
        />
        {query && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {patients.length} patients
          </p>
        )}
      </div>

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>NIC</TableHead>
              <TableHead>Age / Sex</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {patient.name.full}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground font-mono w-fit mt-0.5"
                      >
                        {patient.mrn}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {patient.nic || (patient.phn ? `PHN ${patient.phn}` : "—")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {calculateAge(patient.dob)}y &bull;{" "}
                    {patient.sex.charAt(0).toUpperCase()}
                    {patient.sex.slice(1)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {patient.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(patient.registeredAt)}
                  </TableCell>
                  <TableCell>
                    <Link href={ROUTES.PATIENT(patient.id)}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
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
