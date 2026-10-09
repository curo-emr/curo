import { HeartPulse, House } from "lucide-react";
import type { NavSection } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

// The nurse's whole job is the triage queue; the dashboard is the day at a glance.
export const NAV: NavSection[] = [
  {
    items: [
      { icon: House, label: "Dashboard", href: ROUTES.DASHBOARD },
      { icon: HeartPulse, label: "Triage queue", href: ROUTES.TRIAGE_QUEUE },
    ],
  },
];
