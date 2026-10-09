"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, LogOut, User, Menu, FlaskConical } from "lucide-react";
import { Input } from "@curo/web/ui/input";
import { Button } from "@curo/web/ui/button";
import { useAuth } from "@curo/web/auth";
import { useSidebar } from "@curo/web/ui/sidebar-context";
import { NotificationsMenu } from "@curo/web/notifications";
import { WorkplaceBadge } from "@curo/web/workplace";

export function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();

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
      <div className="flex min-w-0 items-center gap-4 ml-4">
        <WorkplaceBadge icon={FlaskConical} kind="lab" />
        <div className="flex items-center gap-2 mr-4 border-r pr-4">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium hidden sm:inline-block">
            {user?.name || "Lab Technician"}
          </span>
        </div>
        <NotificationsMenu />
        <Button variant="ghost" size="icon" onClick={logout} title="Log out" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
