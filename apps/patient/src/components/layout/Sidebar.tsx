"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@curo/web/auth";
import { ROUTES } from "@/lib/constants";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Pill,
  FlaskConical,
  HeartPulse,
  User,
  Settings,
  Activity,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: ROUTES.DASHBOARD },
  { icon: Calendar, label: "Appointments", href: ROUTES.APPOINTMENTS },
  { icon: ClipboardList, label: "Visits", href: ROUTES.VISITS },
  { icon: Pill, label: "Prescriptions", href: ROUTES.PRESCRIPTIONS },
  { icon: FlaskConical, label: "Lab Reports", href: ROUTES.LAB_REPORTS },
  { icon: HeartPulse, label: "Health Records", href: ROUTES.HEALTH_RECORDS },
  { icon: User, label: "Profile", href: ROUTES.PROFILE },
  { icon: Settings, label: "Settings", href: ROUTES.SETTINGS },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="hidden lg:flex w-64 bg-gradient-to-b from-blue-900 to-blue-950 h-full flex-col text-white shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6" />
          CuroMD
        </h1>
        <p className="text-xs text-blue-300 mt-1">Patient Portal</p>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-blue-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-blue-300 group-hover:text-white")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
            {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'NP'}
          </div>
          <div>
            <p className="text-sm font-medium text-blue-50">{user?.name || 'Patient'}</p>
            <p className="text-xs text-blue-300">Patient</p>
          </div>
        </div>
      </div>
    </div>
  );
}
