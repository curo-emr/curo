"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";
import { UserMenu } from "./UserMenu";

// Brand, navigation and account menu — rendered by the desktop sidebar and the mobile drawer.
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-blue-900 to-blue-950 text-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6" />
          CuroMD
        </h1>
        <p className="text-xs text-blue-300 mt-1">Doctor Portal</p>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                isActive ? "bg-white/15 text-white" : "text-blue-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-blue-300")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-blue-800">
        <UserMenu onNavigate={onNavigate} />
      </div>
    </div>
  );
}
