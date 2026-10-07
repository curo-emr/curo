"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@curo/web/auth";
import { useSidebar } from "@curo/web/ui/sidebar-context";
import { Activity, X } from "lucide-react";
import { navItems } from "./nav-items";

export function MobileSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isOpen, close } = useSidebar();

  return (
    <div className={cn("lg:hidden fixed inset-0 z-50", isOpen ? "visible" : "invisible")}>
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={close}
      />

      {/* Drawer */}
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
            <p className="text-xs text-blue-300 mt-1">Nurse Station</p>
          </div>
          <button onClick={close} className="text-blue-200 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
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
              {user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2) || "RN"}
            </div>
            <div>
              <p className="text-sm font-medium text-blue-50">{user?.name || "Nursing Officer"}</p>
              <p className="text-xs text-blue-300">Triage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
