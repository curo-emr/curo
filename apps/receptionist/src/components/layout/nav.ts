import { CalendarDays, CalendarPlus, House, ListOrdered, ChartColumn, Users, Wallet } from "lucide-react";
import type { NavSection } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

// The front desk's day first, then the money the desk takes.
export const NAV: NavSection[] = [
  {
    items: [
      { icon: House, label: "Dashboard", href: ROUTES.DASHBOARD },
      { icon: ListOrdered, label: "Queue", href: ROUTES.QUEUE },
      { icon: CalendarPlus, label: "Appointments", href: ROUTES.APPOINTMENTS },
      { icon: CalendarDays, label: "Schedule", href: ROUTES.SCHEDULE },
      { icon: Users, label: "Patients", href: ROUTES.PATIENTS },
    ],
  },
  {
    label: "Money",
    items: [
      { icon: Wallet, label: "Income", href: ROUTES.INCOME },
      { icon: ChartColumn, label: "Reports", href: ROUTES.REPORTS },
    ],
  },
];
