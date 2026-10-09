import { Activity, ClipboardList, ShieldAlert } from "lucide-react";
import { AuthShell } from "@curo/web/shell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthShell
      portal="Nurse Station"
      headline="Every patient measured"
      accent="before the doctor."
      tagline="Take each patient's vitals at triage and they're waiting in the doctor's visit when the consultation starts."
      features={[
        { icon: ClipboardList, text: "Today's checked-in patients, in appointment order" },
        { icon: Activity, text: "Vitals flagged against adult ranges as you type" },
        { icon: ShieldAlert, text: "Allergies and conditions shown before you start" },
      ]}
    >
      {children}
    </AuthShell>
  );
}
