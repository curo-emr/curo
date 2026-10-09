import { ProtectedRoute } from "@curo/web/auth";
import { ReceptionistShell } from "@/components/layout/ReceptionistShell";

// The front desk is for receptionists (super admins may look in for support).
const PORTAL_ROLES = ["RECEPTIONIST", "SUPER_ADMIN"];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="receptionists">
      <ReceptionistShell>{children}</ReceptionistShell>
    </ProtectedRoute>
  );
}
