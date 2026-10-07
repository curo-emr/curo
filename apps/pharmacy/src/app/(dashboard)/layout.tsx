import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TooltipProvider } from "@curo/web/ui/tooltip";
import { ProtectedRoute } from "@curo/web/auth";
import { SidebarProvider } from "@curo/web/ui/sidebar-context";

// Only pharmacists: dispensing and stock belong to the pharmacist's own pharmacy,
// so the API refuses them to everyone else, super admins included.
const PORTAL_ROLES = ["PHARMACIST"];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="pharmacists">
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
