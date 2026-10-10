import { ProtectedRoute } from "@curo/web/auth";
import { LabShell } from "@/components/layout/LabShell";

// The lab portal is for laboratory staff (super admins may look in for support).
const PORTAL_ROLES = ["LAB_STAFF", "SUPER_ADMIN"];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="laboratory staff">
      <LabShell>{children}</LabShell>
    </ProtectedRoute>
  );
}
