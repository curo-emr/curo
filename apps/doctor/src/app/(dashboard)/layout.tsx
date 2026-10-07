import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { TooltipProvider } from "@curo/web/ui/tooltip";
import { ProtectedRoute } from "@curo/web/auth";
import { SidebarProvider } from "@curo/web/ui/sidebar-context";

// The doctor portal is for doctors (super admins may look in for support).
const PORTAL_ROLES = ["DOCTOR", "SUPER_ADMIN"];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="doctors">
      <SidebarProvider>
        <TooltipProvider>
          <Sidebar />
          <MobileSidebar />
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <Topbar />
            <main id="main" className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
            </main>
          </div>
        </TooltipProvider>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
