"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronDown, ChevronRight, FlaskConical } from "lucide-react";
import { LabTestCatalogItem } from "@/types";
import { formatTAT, formatStatus } from "@/lib/utils";

interface TestCatalogListProps {
  tests: LabTestCatalogItem[];
}

export function TestCatalogList({ tests }: TestCatalogListProps) {
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [specimenFilter, setSpecimenFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return tests.filter(t => {
      const q = query.toLowerCase().trim();
      const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
      const matchesDept = departmentFilter === "all" || t.department === departmentFilter;
      const matchesSpecimen = specimenFilter === "all" || t.specimenType === specimenFilter;
      return matchesQuery && matchesDept && matchesSpecimen;
    });
  }, [query, departmentFilter, specimenFilter, tests]);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by test name or code..."
              className="pl-9 bg-muted border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Hematology">Hematology</SelectItem>
                <SelectItem value="Biochemistry">Biochemistry</SelectItem>
                <SelectItem value="Microbiology">Microbiology</SelectItem>
              </SelectContent>
            </Select>
            <Select value={specimenFilter} onValueChange={setSpecimenFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Specimen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specimens</SelectItem>
                <SelectItem value="whole_blood">Whole Blood</SelectItem>
                <SelectItem value="serum">Serum</SelectItem>
                <SelectItem value="urine">Urine</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">{filtered.length} tests</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.map(test => {
          const isExpanded = expandedId === test.id;
          return (
            <Card key={test.id} className="shadow-sm border">
              <CardContent className="p-0">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : test.id)}
                  className="w-full text-left p-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{test.name}</span>
                          <Badge variant="outline" className="text-xs">{test.code}</Badge>
                          {test.isPanel && <Badge variant="secondary" className="text-xs bg-status-purple-bg text-status-purple-text">Panel</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>{test.department}</span>
                          <span>{test.specimenType ? formatStatus(test.specimenType) : ''}</span>
                          <span>{test.containerType}</span>
                          <span>TAT: {formatTAT(test.tat ?? 0)}</span>
                          <span>Rs. {(test.price ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t p-4 bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Components & Reference Ranges</p>
                    <div className="space-y-1.5">
                      {(test.components ?? []).map(comp => (
                        <div key={comp.id} className="flex items-center justify-between text-sm bg-white rounded-md px-3 py-2 border">
                          <span className="text-foreground">{comp.name}</span>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span className="text-xs">{comp.unit || '-'}</span>
                            <span className="text-xs font-mono">
                              {comp.referenceRange.low !== 0 || comp.referenceRange.high !== 0
                                ? `${comp.referenceRange.low} - ${comp.referenceRange.high}`
                                : '-'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
