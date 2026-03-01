import { getAppointments, getPatients } from "@/lib/data/api";
import { ScheduleClient } from "./ScheduleClient";

export default async function SchedulePage() {
  const appointments = await getAppointments();
  const patients = await getPatients();

  return <ScheduleClient appointments={appointments} patients={patients} />;
}
