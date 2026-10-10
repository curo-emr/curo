import { ClipboardList, Package, ShieldAlert } from "lucide-react";
import { AuthShell } from "@curo/web/shell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthShell
      portal="Pharmacy"
      headline="The right medicine,"
      accent="from the right batch."
      tagline="Dispense the doctors' prescriptions from your pharmacy's stock, earliest expiry first."
      features={[
        { icon: ClipboardList, text: "Prescriptions arrive as soon as the doctor signs the visit" },
        { icon: ShieldAlert, text: "The patient's allergies are on screen before you dispense" },
        { icon: Package, text: "Stock levels, low-stock alerts and expiry dates by batch" },
      ]}
    >
      {children}
    </AuthShell>
  );
}
