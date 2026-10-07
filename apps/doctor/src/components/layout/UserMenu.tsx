"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@curo/web/ui/dropdown-menu";

export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const name = user?.name ? `Dr. ${user.name}` : "Doctor";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">
          {getInitials(user?.name) || "DR"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-blue-50">{name}</p>
          <p className="truncate text-xs text-blue-300">{user?.specialty || "General Practice"}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-blue-300" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.SETTINGS} onClick={onNavigate}>
            <Settings /> Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
