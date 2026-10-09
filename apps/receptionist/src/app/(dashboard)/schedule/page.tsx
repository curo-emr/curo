"use client";

import { ScheduleClient } from "./ScheduleClient";
import { useDoctors } from "@/lib/hooks/useDoctors";

export default function SchedulePage() {
  return <ScheduleClient doctors={useDoctors()} />;
}
