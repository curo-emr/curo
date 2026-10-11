import { ProtectedRoute } from "@curo/web/auth";
import { AdminShell } from "@/components/layout/AdminShell";

const PORTAL_ROLES = ["SUPER_ADMIN"];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="super administrators">
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
