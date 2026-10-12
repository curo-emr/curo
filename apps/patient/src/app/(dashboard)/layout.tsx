import { ProtectedRoute } from "@curo/web/auth";
import { sidebarStartsOpen } from "@curo/web/shell/sidebar-state";
import { PatientShell } from "@/components/layout/PatientShell";

// The patient portal shows the signed-in patient's own record, so only patients.
const PORTAL_ROLES = ["PATIENT"];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute roles={PORTAL_ROLES} audience="patients">
      <PatientShell sidebarOpen={await sidebarStartsOpen()}>{children}</PatientShell>
    </ProtectedRoute>
  );
}
