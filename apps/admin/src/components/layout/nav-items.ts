import { LayoutDashboard, Users, Building2, Wallet, ScrollText, Settings } from "lucide-react";
import { ROUTES } from "@/lib/constants";

// The portal's sections, shared by the desktop and mobile sidebars.
export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: ROUTES.DASHBOARD },
  { icon: Users, label: "Users", href: ROUTES.USERS },
  { icon: Building2, label: "Organizations", href: ROUTES.ORGANIZATIONS },
  { icon: Wallet, label: "Income", href: ROUTES.INCOME },
  { icon: ScrollText, label: "Audit Log", href: ROUTES.AUDIT },
  { icon: Settings, label: "Settings", href: ROUTES.SETTINGS },
];
