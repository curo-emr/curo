"use client";

import { PageHeader } from "@curo/web/ui/page-header";
import { ReportsDashboard } from "@/components/features/reports/ReportsDashboard";
import { useDoctors } from "@/lib/hooks/useDoctors";

export default function ReportsPage() {
  const doctors = useDoctors();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Reports" description="View appointment statistics and clinic analytics" />
      <ReportsDashboard doctors={doctors} />
    </div>
  );
}
