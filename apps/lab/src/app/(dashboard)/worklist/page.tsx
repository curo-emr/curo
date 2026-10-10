"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { PageHeader } from "@curo/web/ui/page-header";
import { WorklistTable } from "@/components/features/worklist/WorklistTable";
import { ScanBox } from "@/components/features/worklist/ScanBox";
import { ROUTES } from "@/lib/constants";

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function WorklistPage() {
  return (
    <Suspense>
      <Worklist />
    </Suspense>
  );
}

function Worklist() {
  // Set when a scanned visit slip narrowed the list to that visit's tests.
  const visit = useSearchParams().get("visit") ?? undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Worklist" description="Every order sent to your lab, stat first, then the longest waiting." />

      <ScanBox />

      {visit && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
          <span className="text-foreground">Showing the tests from one visit that were sent to your lab.</span>
          <Link href={ROUTES.WORKLIST} className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">
            <X className="size-3.5" /> Show all
          </Link>
        </div>
      )}

      {/* Keyed so a new visit starts the list afresh. */}
      <WorklistTable key={visit ?? "all"} visit={visit} />
    </div>
  );
}
