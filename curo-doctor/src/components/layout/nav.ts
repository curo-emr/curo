import { LayoutDashboard, Users, Calendar, Building2, Activity } from "lucide-react";
import { ROUTES } from "@/lib/constants";

// One nav definition shared by the desktop sidebar and the mobile drawer.
export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Today", href: ROUTES.DASHBOARD },
  { icon: Users, label: "Patients", href: ROUTES.PATIENTS },
  { icon: Calendar, label: "Schedule", href: ROUTES.SCHEDULE },
  { icon: Building2, label: "Pharmacies & Labs", href: ROUTES.DIRECTORY },
  { icon: Activity, label: "ICD-10", href: ROUTES.ICD },
];
