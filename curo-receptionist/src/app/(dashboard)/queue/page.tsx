import {
  getAppointments,
  getPatients,
  getDoctors,
  getVisits,
} from "@/lib/data/api";
import { getTodayString } from "@/lib/utils";
import { QueueBoard } from "@/components/features/queue/QueueBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function QueuePage() {
  const todayStr = getTodayString();

  const [allAppointments, patients, doctors, allVisits] = await Promise.all([
    getAppointments(),
    getPatients(),
    getDoctors(),
    getVisits(),
  ]);

  const todayAppointments = allAppointments.filter((a) => a.date === todayStr);
  const todayVisits = allVisits.filter((v) => v.date === todayStr);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Queue Board"
        description="Real-time patient waiting room and visit tracking"
      />

      <QueueBoard
        appointments={todayAppointments}
        patients={patients}
        doctors={doctors}
        visits={todayVisits}
      />
    </div>
  );
}
