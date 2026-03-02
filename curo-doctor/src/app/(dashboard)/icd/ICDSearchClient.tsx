"use client";

import { useState, useMemo } from "react";
import { ICD10 } from "@/types";
import { Input } from "@/components/ui/input";

import { Search, Activity, Hash, Tag } from "lucide-react";

interface Props {
  catalog: ICD10[];
}

export function ICDSearchClient({ catalog }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return catalog; // Show all if no query
    
    const q = query.toLowerCase();
    return catalog.filter(item => 
      item.code.toLowerCase().includes(q) || 
      item.name.toLowerCase().includes(q) || 
      item.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [query, catalog]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-2xl mx-auto">
        <label htmlFor="icd-search" className="sr-only">Search ICD-10 Catalog</label>
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-6 w-6 text-blue-400" />
          <Input 
            id="icd-search" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Search by diagnosis code, description, or alias..." 
            className="pl-14 h-14 text-lg bg-white border-2 border-slate-200 focus-visible:ring-blue-500 rounded-xl shadow-sm"
            autoComplete="off"
            autoFocus
          />
        </div>
        <p className="text-sm text-slate-500 mt-2 ml-2">
          {results.length} {results.length === 1 ? 'result' : 'results'} found out of {catalog.length} codes.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {results.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Activity className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-700">No matching diagnoses found.</p>
            <p className="mt-1">Try adjusting your search terms or keywords.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-4 font-medium w-32"><div className="flex items-center gap-2"><Hash className="h-4 w-4" /> Code</div></th>
                <th className="px-6 py-4 font-medium"><div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Description</div></th>
                <th className="px-6 py-4 font-medium hidden lg:table-cell"><div className="flex items-center gap-2"><Tag className="h-4 w-4" /> Keywords</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 block md:table-row-group">
              {results.map(icd => (
                <tr key={icd.code} className="hover:bg-slate-50 transition-colors block md:table-row p-4 md:p-0">
                  <td className="md:px-6 md:py-4 align-top block md:table-cell mb-2 md:mb-0">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded text-sm border border-blue-100">
                      {icd.code}
                    </span>
                  </td>
                  <td className="md:px-6 md:py-4 align-top block md:table-cell mb-2 md:mb-0">
                    <span className="font-medium text-slate-900 text-base">{icd.name}</span>
                  </td>
                  <td className="md:px-6 md:py-4 align-top block lg:table-cell text-slate-500 text-sm">
                    <div className="flex flex-wrap gap-1.5">
                      {icd.keywords.map((k, idx) => (
                        <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                          {k}
                        </span>
                      ))}
                      {icd.keywords.length === 0 && <span className="text-slate-400 italic">None</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
