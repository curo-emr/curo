import { Building2, KeyRound, ScrollText } from "lucide-react";
import { AuthShell } from "@curo/web/shell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthShell
      portal="Admin Portal"
      headline="Everyone's account,"
      accent="in one place."
      tagline="Set up staff accounts, reset passwords, and keep an eye on income and the audit log."
      features={[
        { icon: KeyRound, text: "Accounts and password resets for every portal" },
        { icon: Building2, text: "Clinics, pharmacies and labs, and who works where" },
        { icon: ScrollText, text: "Income by receptionist and an audit log of changes" },
      ]}
    >
      {children}
    </AuthShell>
  );
}
