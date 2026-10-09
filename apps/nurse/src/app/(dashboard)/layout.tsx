import { ProtectedRoute } from "@curo/web/auth";
import { NurseShell } from "@/components/layout/NurseShell";

// The nurse station is for nursing officers (super admins may look in for support).
const PORTAL_ROLES = ["NURSE", "SUPER_ADMIN"];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="nursing officers">
      <NurseShell>{children}</NurseShell>
    </ProtectedRoute>
  );
}
