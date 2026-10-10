import { ChartColumn, ClipboardList, House, Package, ReceiptText, Users } from "lucide-react";
import type { NavSection } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

// The counter's work first, then the shelves and the numbers behind them.
export const NAV: NavSection[] = [
  {
    items: [
      { icon: House, label: "Dashboard", href: ROUTES.DASHBOARD },
      { icon: ClipboardList, label: "Prescriptions", href: ROUTES.PRESCRIPTIONS },
      { icon: ReceiptText, label: "Dispensing log", href: ROUTES.DISPENSING_LOG },
      { icon: Users, label: "Patients", href: ROUTES.PATIENTS },
    ],
  },
  {
    label: "Stock",
    items: [
      { icon: Package, label: "Inventory", href: ROUTES.INVENTORY },
      { icon: ChartColumn, label: "Reports", href: ROUTES.REPORTS },
    ],
  },
];
