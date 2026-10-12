import { ProtectedRoute } from "@curo/web/auth";
import { sidebarStartsOpen } from "@curo/web/shell/sidebar-state";
import { DoctorShell } from "@/components/layout/DoctorShell";

// The doctor portal is for doctors (super admins may look in for support).
const PORTAL_ROLES = ["DOCTOR", "SUPER_ADMIN"];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="doctors">
      <DoctorShell sidebarOpen={await sidebarStartsOpen()}>{children}</DoctorShell>
    </ProtectedRoute>
  );
}
