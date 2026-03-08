"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/constants";
import { LayoutDashboard, Users, Calendar, Settings, Activity } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: ROUTES.DASHBOARD },
  { icon: Users, label: "Patients", href: ROUTES.PATIENTS },
  { icon: Calendar, label: "Schedule", href: ROUTES.SCHEDULE },
  { icon: Activity, label: "ICD-10", href: ROUTES.ICD },
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
        <p className="text-xs text-blue-300 mt-1">Doctor Portal</p>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
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
            {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'DR'}
          </div>
          <div>
            <p className="text-sm font-medium text-blue-50">{user?.name || 'Doctor'}</p>
            <p className="text-xs text-blue-300">General Practice</p>
          </div>
        </div>
      </div>
    </div>
  );
}
