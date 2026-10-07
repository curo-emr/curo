"use client";

import { Sheet, SheetContent, SheetTitle } from "@curo/web/ui/sheet";
import { useSidebar } from "@curo/web/ui/sidebar-context";
import { SidebarContent } from "./SidebarContent";

export function MobileSidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && close()}>
      <SheetContent side="left" className="w-64 p-0 border-none lg:hidden" showCloseButton={false}>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent onNavigate={close} />
      </SheetContent>
    </Sheet>
  );
}
