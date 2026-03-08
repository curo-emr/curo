"use client";

import { useState } from "react";
import { ICD10, Diagnosis } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Trash2, Stethoscope } from "lucide-react";

interface DiagnosisSearchProps {
  icd10Catalog: ICD10[];
  diagnoses: Diagnosis[];
  setDiagnoses: React.Dispatch<React.SetStateAction<Diagnosis[]>>;
}

export function DiagnosisSearch({ icd10Catalog, diagnoses, setDiagnoses }: DiagnosisSearchProps) {
  const [icdQuery, setIcdQuery] = useState("");

  const filteredIcd = icdQuery
    ? icd10Catalog.filter(i => {
        const q = icdQuery.toLowerCase();
        return i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.keywords.some(k => k.toLowerCase().includes(q));
      }).slice(0, 6)
    : [];

  const addDiagnosis = (icd: ICD10) => {
    if (!diagnoses.some(d => d.icdCode === icd.code)) {
      setDiagnoses(prev => [...prev, { icdCode: icd.code, name: icd.name, isPrimary: prev.length === 0 }]);
    }
    setIcdQuery("");
  };

  const togglePrimary = (code: string) => {
    setDiagnoses(prev => prev.map(d => ({ ...d, isPrimary: d.icdCode === code })));
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" /> Diagnoses
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="relative">
          <Label htmlFor="icd-search" className="sr-only">Search ICD-10</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="icd-search"
              value={icdQuery}
              onChange={e => setIcdQuery(e.target.value)}
              placeholder="Search diagnoses by keyword or ICD-10 code..."
              className="pl-9"
              autoComplete="off"
            />
          </div>
          {/* Dropdown */}
          {icdQuery && (
            <div className="absolute top-11 left-0 right-0 bg-white border rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
              {filteredIcd.length > 0 ? filteredIcd.map(icd => (
                <button
                  key={icd.code}
                  type="button"
                  onClick={() => addDiagnosis(icd)}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm border-b last:border-0 flex justify-between items-center gap-4"
                >
                  <span className="font-medium">{icd.name}</span>
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">{icd.code}</span>
                </button>
              )) : (
                <div className="px-4 py-3 text-sm text-muted-foreground">No matching diagnoses found.</div>
              )}
            </div>
          )}
        </div>

        {diagnoses.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted border-b text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">ICD-10</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Primary</th>
                  <th className="px-4 py-2 font-medium text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {diagnoses.map(d => (
                  <tr key={d.icdCode} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-foreground">{d.icdCode}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="radio"
                        name="primary-diagnosis"
                        checked={d.isPrimary}
                        onChange={() => togglePrimary(d.icdCode)}
                        className="h-4 w-4 text-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-status-error-bg"
                        onClick={() => setDiagnoses(prev => prev.filter(x => x.icdCode !== d.icdCode))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
