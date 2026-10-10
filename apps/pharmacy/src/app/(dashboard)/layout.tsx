import { ProtectedRoute } from "@curo/web/auth";
import { PharmacyShell } from "@/components/layout/PharmacyShell";

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
      <PharmacyShell>{children}</PharmacyShell>
    </ProtectedRoute>
  );
}
