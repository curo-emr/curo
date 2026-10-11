import { Building2, House, ScrollText, Users, Wallet } from "lucide-react";
import type { NavSection } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

// Accounts and where people work first, then what the admin keeps an eye on.
export const NAV: NavSection[] = [
  {
    items: [
      { icon: House, label: "Dashboard", href: ROUTES.DASHBOARD },
      { icon: Users, label: "Users", href: ROUTES.USERS },
      { icon: Building2, label: "Organizations", href: ROUTES.ORGANIZATIONS },
    ],
  },
  {
    label: "Oversight",
    items: [
      { icon: Wallet, label: "Income", href: ROUTES.INCOME },
      { icon: ScrollText, label: "Audit log", href: ROUTES.AUDIT },
    ],
  },
];
