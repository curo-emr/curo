import { BookOpen, Building2, CalendarDays, House, Users } from "lucide-react";
import type { NavSection } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

// The doctor's day first; lookups they reach for while documenting below.
export const NAV: NavSection[] = [
  {
    items: [
      { icon: House, label: "Today", href: ROUTES.DASHBOARD },
      { icon: Users, label: "Patients", href: ROUTES.PATIENTS },
      { icon: CalendarDays, label: "Schedule", href: ROUTES.SCHEDULE },
    ],
  },
  {
    label: "Reference",
    items: [
      { icon: Building2, label: "Pharmacies & Labs", href: ROUTES.DIRECTORY },
      { icon: BookOpen, label: "ICD-10 codes", href: ROUTES.ICD },
    ],
  },
];
