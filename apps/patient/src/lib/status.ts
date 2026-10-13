import type { Status } from "@curo/web/ui/status-badge";
import type { AppointmentStatus, LabTestStatus, MedicineStatus } from "@/types";

// Each status in plain words, with the shared status colours.

interface StatusWords {
  status: Status;
  label: string;
}

export const APPOINTMENT_STATUS: Record<AppointmentStatus, StatusWords> = {
  scheduled: { status: "scheduled", label: "Booked" },
  arrived: { status: "arrived", label: "Checked in" },
  completed: { status: "completed", label: "Completed" },
  cancelled: { status: "cancelled", label: "Cancelled" },
  no_show: { status: "no_show", label: "Missed" },
};

export const MEDICINE_STATUS: Record<MedicineStatus, StatusWords> = {
  to_collect: { status: "pending", label: "To collect" },
  on_hold: { status: "on_hold", label: "On hold" },
  collected: { status: "dispensed", label: "Collected" },
  stopped: { status: "cancelled", label: "Stopped" },
  buy_outside: { status: "outside_pharmacy", label: "Buy at any pharmacy" },
};

export const LAB_TEST_STATUS: Record<LabTestStatus, StatusWords> = {
  ordered: { status: "sent_to_lab", label: "Sent to the lab" },
  in_lab: { status: "sample_received", label: "Sample received" },
  done: { status: "results_ready", label: "Results ready" },
  cancelled: { status: "cancelled", label: "Cancelled" },
};
