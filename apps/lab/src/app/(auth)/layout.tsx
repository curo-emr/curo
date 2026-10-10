import { ClipboardList, ScanLine, TriangleAlert } from "lucide-react";
import { AuthShell } from "@curo/web/shell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthShell
      portal="Laboratory"
      headline="Every sample,"
      accent="back to its doctor."
      tagline="Receive the doctors' lab orders, enter the results, and send them back to the visit."
      features={[
        { icon: ClipboardList, text: "Orders arrive when the doctor sends them, stat first" },
        { icon: ScanLine, text: "Scan a sample label to receive it, or a lab slip to find the visit" },
        { icon: TriangleAlert, text: "Results outside the reference range are flagged for the doctor" },
      ]}
    >
      {children}
    </AuthShell>
  );
}
