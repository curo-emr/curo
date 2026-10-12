import { ProtectedRoute } from "@curo/web/auth";
import { sidebarStartsOpen } from "@curo/web/shell/sidebar-state";
import { LabShell } from "@/components/layout/LabShell";

// The lab portal is for laboratory staff (super admins may look in for support).
const PORTAL_ROLES = ["LAB_STAFF", "SUPER_ADMIN"];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="laboratory staff">
      <LabShell sidebarOpen={await sidebarStartsOpen()}>{children}</LabShell>
    </ProtectedRoute>
  );
}
