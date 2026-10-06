import { LayoutDashboard, HeartPulse, Settings } from "lucide-react";
import { ROUTES } from "@/lib/constants";

// Single source for the desktop and mobile sidebars.
export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: ROUTES.DASHBOARD },
  { icon: HeartPulse, label: "Triage queue", href: ROUTES.TRIAGE_QUEUE },
  { icon: Settings, label: "Settings", href: ROUTES.SETTINGS },
];
