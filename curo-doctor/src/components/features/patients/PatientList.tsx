"use client";

import { useState, useMemo } from "react";
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
import { Search, ChevronRight, User, ShieldAlert, ShieldCheck } from "lucide-react";
import { Patient, Allergy } from "@/types";
import { calculateAge, formatDate } from "@/lib/utils";
import Link from "next/link";

interface PatientListProps {
  initialPatients: Patient[];
  allergyMap: Record<string, Allergy>;
}

export function PatientList({ initialPatients, allergyMap }: PatientListProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [sexFilter, setSexFilter] = useState<"all" | "male" | "female" | "other">("all");

  const filtered = useMemo(() => {
    return initialPatients.filter(p => {
      const q = query.toLowerCase().trim();
      const matchesQuery = !q || (
        p.name.full.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
      const matchesSex = sexFilter === "all" || p.sex === sexFilter;
      return matchesQuery && matchesSex;
    });
  }, [query, sexFilter, initialPatients]);

  const SEX_FILTERS: { label: string; value: typeof sexFilter }[] = [
    { label: "All", value: "all" },
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
  ];

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, MRN, phone, or tags..."
              className="pl-9 bg-slate-50 border-slate-200"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Sex:</span>
            {SEX_FILTERS.map(f => (
              <Button
                key={f.value}
                variant={sexFilter === f.value ? "default" : "outline"}
                size="sm"
                className={
                  sexFilter === f.value
                    ? "h-7 text-xs bg-blue-600 hover:bg-blue-700"
                    : "h-7 text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
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
                className="h-7 text-xs text-slate-400 hover:text-slate-600 ml-auto"
                onClick={() => { setQuery(""); setSexFilter("all"); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result count */}
      {(query || sexFilter !== "all") && (
        <p className="text-sm text-slate-500 px-1">
          {filtered.length} of {initialPatients.length} patients shown
        </p>
      )}

      {/* Patient Table */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
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
            {filtered.length > 0 ? (
              filtered.map(patient => (
                <TableRow key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col max-w-[160px] sm:max-w-[250px]">
                        <Tooltip>
                          <TooltipTrigger className="cursor-default text-left truncate font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {patient.name.full}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{patient.name.full}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-slate-400 truncate">{patient.mrn}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {calculateAge(patient.dob)}y • {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}
                  </TableCell>
                  <TableCell className="text-slate-600">{patient.phone}</TableCell>
                  <TableCell>
                    {patient.allergies.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default w-fit">
                            <Badge variant="destructive" className="bg-red-50 text-red-700 text-xs font-medium border-red-200 hover:bg-red-50 flex items-center gap-1.5 px-2.5 py-0.5">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {patient.allergies.length} {patient.allergies.length === 1 ? 'Allergy' : 'Allergies'}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-3">
                          <p className="font-semibold text-xs mb-2 text-slate-700">Allergies for {patient.name.first}</p>
                          <ul className="text-xs space-y-1.5">
                            {patient.allergies.map(id => {
                              const alg = allergyMap[id];
                              if (!alg) return null;
                              return (
                                <li key={id} className="flex items-center gap-2 leading-tight">
                                  <div className="h-1 w-1 rounded-full bg-red-400 shrink-0" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{alg.substance}</span>
                                    {alg.reaction && <span className="text-[10px] text-slate-500">{alg.reaction}</span>}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs font-medium border-emerald-200 hover:bg-emerald-50 flex items-center gap-1.5 w-fit px-2.5 py-0.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        None
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {formatDate(patient.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/patients/${patient.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-blue-600 hover:bg-blue-50">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500 border-dashed">
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
