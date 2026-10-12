import { ProtectedRoute } from "@curo/web/auth";
import { sidebarStartsOpen } from "@curo/web/shell/sidebar-state";
import { AdminShell } from "@/components/layout/AdminShell";

const PORTAL_ROLES = ["SUPER_ADMIN"];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="super administrators">
      <AdminShell sidebarOpen={await sidebarStartsOpen()}>{children}</AdminShell>
    </ProtectedRoute>
  );
}
