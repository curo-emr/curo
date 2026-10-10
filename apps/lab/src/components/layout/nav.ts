import { ChartColumn, ClipboardList, FlaskConical, House, ShieldCheck, Users } from "lucide-react";
import type { NavSection } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

// The bench's work first, then the lab's reference pages and numbers.
export const NAV: NavSection[] = [
  {
    items: [
      { icon: House, label: "Dashboard", href: ROUTES.DASHBOARD },
      { icon: ClipboardList, label: "Worklist", href: ROUTES.WORKLIST },
      { icon: Users, label: "Patients", href: ROUTES.PATIENTS },
    ],
  },
  {
    label: "Laboratory",
    items: [
      { icon: FlaskConical, label: "Test catalog", href: ROUTES.TEST_CATALOG },
      { icon: ShieldCheck, label: "Quality control", href: ROUTES.QC },
      { icon: ChartColumn, label: "Reports", href: ROUTES.REPORTS },
    ],
  },
];
