import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TooltipProvider } from "@curo/web/ui/tooltip";
import { ProtectedRoute } from "@curo/web/auth";
import { SidebarProvider } from "@curo/web/ui/sidebar-context";

// The patient portal shows the signed-in patient's own record, so only patients.
const PORTAL_ROLES = ["PATIENT"];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="patients">
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
