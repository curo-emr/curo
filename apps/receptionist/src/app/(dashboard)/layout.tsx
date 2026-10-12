import { ProtectedRoute } from "@curo/web/auth";
import { sidebarStartsOpen } from "@curo/web/shell/sidebar-state";
import { ReceptionistShell } from "@/components/layout/ReceptionistShell";

// The front desk is for receptionists (super admins may look in for support).
const PORTAL_ROLES = ["RECEPTIONIST", "SUPER_ADMIN"];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="receptionists">
      <ReceptionistShell sidebarOpen={await sidebarStartsOpen()}>{children}</ReceptionistShell>
    </ProtectedRoute>
  );
}
