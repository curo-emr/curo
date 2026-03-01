"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Calendar, Settings, Activity } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Patients", href: "/patients" },
  { icon: Calendar, label: "Schedule", href: "/schedule" },
  { icon: Activity, label: "ICD-10", href: "/icd" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-sidebar h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Activity className="h-6 w-6" />
          CuroMD
        </h1>
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
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            DR
          </div>
          <div>
            <p className="text-sm font-medium">Dr. Nimal Peiris</p>
            <p className="text-xs text-muted-foreground">General Practice</p>
          </div>
        </div>
      </div>
    </div>
  );
}
