import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SidebarProvider } from "@/contexts/SidebarContext";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute>
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
