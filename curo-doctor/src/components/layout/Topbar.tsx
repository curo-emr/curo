"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/contexts/SidebarContext";
import { PatientSearch } from "./PatientSearch";
import { NotificationsMenu } from "./NotificationsMenu";

export function Topbar() {
  const { toggle } = useSidebar();

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur flex items-center gap-3 px-4 lg:px-8 shrink-0">
      <Button variant="ghost" size="icon" onClick={toggle} className="lg:hidden text-muted-foreground hover:text-foreground" aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1">
        <PatientSearch />
      </div>
      <NotificationsMenu />
    </header>
  );
}
