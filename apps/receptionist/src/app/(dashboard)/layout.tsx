import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TooltipProvider } from "@curo/web/ui/tooltip";
import { ProtectedRoute } from "@curo/web/auth";
import { SidebarProvider } from "@curo/web/ui/sidebar-context";

// The front desk is for receptionists (super admins may look in for support).
const PORTAL_ROLES = ["RECEPTIONIST", "SUPER_ADMIN"];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="receptionists">
      <SidebarProvider>
        <TooltipProvider>
          <Sidebar />
          <MobileSidebar />
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6 relative">
              <Breadcrumbs />
              {children}
            </main>
          </div>
        </TooltipProvider>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
