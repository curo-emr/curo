import { getAppointments, getPatients, getDoctors } from "@/lib/data/api";
import { ScheduleClient } from "./ScheduleClient";

export default async function SchedulePage() {
  const [appointments, patients, doctors] = await Promise.all([
    getAppointments(),
    getPatients(),
    getDoctors(),
  ]);

  return (
    <ScheduleClient
      appointments={appointments}
      patients={patients}
      doctors={doctors}
    />
  );
}
