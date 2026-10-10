"use client";

import { useMemo, useState } from "react";
import { FlaskConical, SearchX } from "lucide-react";
import { EmptyState } from "@curo/web/ui/empty-state";
import { SearchInput } from "@curo/web/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import type { LabTestCatalogItem } from "@/types";

const ALL = "all";

/** The distinct values of one field, sorted, for a filter's options. */
const optionsOf = (tests: LabTestCatalogItem[], field: "category" | "specimen") =>
  [...new Set(tests.map(t => t[field]).filter((v): v is string => !!v))].sort();

export function TestCatalogList({ tests }: { tests: LabTestCatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [specimen, setSpecimen] = useState(ALL);
  const categories = useMemo(() => optionsOf(tests, "category"), [tests]);
  const specimens = useMemo(() => optionsOf(tests, "specimen"), [tests]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tests.filter(t =>
      (!q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)) &&
      (category === ALL || t.category === category) &&
      (specimen === ALL || t.specimen === specimen),
    );
  }, [tests, query, category, specimen]);

  if (tests.length === 0) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <EmptyState icon={FlaskConical} title="No tests in the catalog" description="Your lab doesn't offer any tests yet." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Test name or LOINC code…" className="min-w-0 flex-1" />
        <div className="flex gap-2">
          <FilterSelect label="Category" anyLabel="Any category" value={category} onChange={setCategory} options={categories} />
          <FilterSelect label="Specimen" anyLabel="Any specimen" value={specimen} onChange={setSpecimen} options={specimens} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="No tests match" description="Try another name or code, or clear a filter." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Specimen</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(test => (
                  <TableRow key={test.id}>
                    <TableCell>
                      <span className="block font-medium text-foreground">{test.name}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{test.code}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{test.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{test.specimen ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-foreground">
                      {test.price == null ? "—" : `Rs. ${test.price.toLocaleString()}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {filtered.length} of {tests.length} tests
      </p>
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  anyLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

function FilterSelect({ label, anyLabel, value, onChange, options }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{anyLabel}</SelectItem>
        {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
