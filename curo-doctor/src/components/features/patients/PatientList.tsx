"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, ChevronRight, User } from "lucide-react";
import { Patient } from "@/types";
import { calculateAge, formatDate } from "@/lib/utils";
import Link from "next/link";

interface PatientListProps {
  initialPatients: Patient[];
}

export function PatientList({ initialPatients }: PatientListProps) {
  const [query, setQuery] = useState("");

  const filtered = initialPatients.filter(p => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.name.full.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, MRN, phone, or tags..."
              className="pl-9 bg-slate-50 border-slate-200"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="px-3 py-2 text-slate-500 font-normal">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(patient => (
          <Link href={`/patients/${patient.id}`} key={patient.id} className="block group">
            <Card className="shadow-sm border-slate-200 hover:border-blue-300 hover:shadow-md transition-all h-full bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {patient.name.full}
                      </h3>
                      <p className="text-xs text-slate-500">{patient.mrn}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
                
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Age / Sex</span>
                    <span>{calculateAge(patient.dob)}y • {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone</span>
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Seen</span>
                    <span>{formatDate(patient.updatedAt)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1">
                  {patient.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-medium border-slate-200">
                      {tag}
                    </Badge>
                  ))}
                  {patient.allergies.length > 0 && (
                    <Badge variant="destructive" className="bg-red-50 text-red-700 text-[10px] font-medium border-red-200 hover:bg-red-50">
                      {patient.allergies.length} Allergies
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
            No patients match your search.
          </div>
        )}
      </div>
    </div>
  );
}
