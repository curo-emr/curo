import {
  LayoutDashboard,
  Users,
  CalendarPlus,
  Calendar,
  ListOrdered,
  BarChart3,
  Wallet,
  Settings,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

// Single source for the desktop and mobile sidebars.
export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: ROUTES.DASHBOARD },
  { icon: Users, label: "Patients", href: ROUTES.PATIENTS },
  { icon: CalendarPlus, label: "Appointments", href: ROUTES.APPOINTMENTS },
  { icon: Calendar, label: "Schedule", href: ROUTES.SCHEDULE },
  { icon: ListOrdered, label: "Queue", href: ROUTES.QUEUE },
  { icon: Wallet, label: "Income", href: ROUTES.INCOME },
  { icon: BarChart3, label: "Reports", href: ROUTES.REPORTS },
  { icon: Settings, label: "Settings", href: ROUTES.SETTINGS },
];
