"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@curo/web/auth";
import { useSidebar } from "@/contexts/SidebarContext";
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
  X,
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

export function MobileSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isOpen, close } = useSidebar();

  return (
    <div className={cn("lg:hidden fixed inset-0 z-50", isOpen ? "visible" : "invisible")}>
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={close}
      />
      <div
        className={cn(
          "absolute top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-white flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="h-6 w-6" />
              CuroMD
            </h1>
            <p className="text-xs text-blue-300 mt-1">Patient Portal</p>
          </div>
          <button onClick={close} className="text-blue-200 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-blue-300")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
              {user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2) || "NP"}
            </div>
            <div>
              <p className="text-sm font-medium text-blue-50">{user?.name || "Patient"}</p>
              <p className="text-xs text-blue-300">Patient</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
