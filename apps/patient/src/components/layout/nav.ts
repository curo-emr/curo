import { CalendarDays, ClipboardList, FlaskConical, HeartPulse, House, Pill } from "lucide-react";
import type { NavSection } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

// One plain list: a patient looks things up, they don't work through a queue.
export const NAV: NavSection[] = [
  {
    items: [
      { icon: House, label: "Home", href: ROUTES.HOME },
      { icon: CalendarDays, label: "Appointments", href: ROUTES.APPOINTMENTS },
      { icon: ClipboardList, label: "Visits", href: ROUTES.VISITS },
      { icon: Pill, label: "Medicines", href: ROUTES.MEDICINES },
      { icon: FlaskConical, label: "Test results", href: ROUTES.TEST_RESULTS },
      { icon: HeartPulse, label: "My health", href: ROUTES.MY_HEALTH },
    ],
  },
];
