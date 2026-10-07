"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@curo/web/ui/page-header";
import { ReportsDashboard } from "@/components/features/reports/ReportsDashboard";
import { getDoctors } from "@/lib/api/practitioners";
import type { Doctor } from "@/types";

export default function ReportsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Reports" description="View appointment statistics and clinic analytics" />
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <ReportsDashboard doctors={doctors} />
      )}
    </div>
  );
}
