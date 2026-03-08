import {
  getAppointments,
  getPatients,
  getDoctors,
  getVisits,
} from "@/lib/data/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportsDashboard } from "@/components/features/reports/ReportsDashboard";

export default async function ReportsPage() {
  const [appointments, patients, doctors, visits] = await Promise.all([
    getAppointments(),
    getPatients(),
    getDoctors(),
    getVisits(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Reports"
        description="View appointment statistics and clinic analytics"
      />

      <ReportsDashboard
        appointments={appointments}
        patients={patients}
        doctors={doctors}
        visits={visits}
      />
    </div>
  );
}
