import { ICDSearchClient } from "./ICDSearchClient";
import { Activity } from "lucide-react";

export default function ICDPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start gap-4 mb-8 border-b border-slate-200 pb-6">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
          <Activity className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">ICD-10 Dictionary</h1>
          <p className="text-slate-500 mt-1 max-w-2xl text-sm">
            Quickly lookup, verify, and reference International Classification of Diseases, Tenth Revision codes.
            Search by exact code, description, or common clinical aliases.
          </p>
        </div>
      </div>

      <ICDSearchClient />
    </div>
  );
}
