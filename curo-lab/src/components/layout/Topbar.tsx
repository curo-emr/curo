"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, Bell, LogOut, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { getNotificationCount } from "@/lib/api/notifications";

export function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();

  useEffect(() => {
    if (!user) return;
    getNotificationCount().then(setUnreadCount);
    const interval = setInterval(() => getNotificationCount().then(setUnreadCount), 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/patients?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <header className="h-16 border-b bg-background flex items-center px-6 justify-between shrink-0">
      <Button variant="ghost" size="icon" onClick={toggle} className="lg:hidden mr-2 text-muted-foreground hover:text-foreground">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1 flex items-center max-w-xl">
        <form onSubmit={handleSearch} className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by patient, MRN, accession..."
            className="w-full pl-9 bg-muted/50 border-none focus-visible:ring-1"
          />
        </form>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 mr-4 border-r pr-4">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium hidden sm:inline-block">
            {user?.name || "Lab Technician"}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={logout} title="Log out" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
