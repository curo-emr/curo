import { ClipboardList, HeartPulse, Send } from "lucide-react";
import { AuthShell } from "@curo/web/shell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthShell
      portal="Doctor Portal"
      headline="See the next patient"
      accent="with everything ready."
      tagline="Today's queue, the chart and the visit note in one place, so each consultation starts where triage left off."
      features={[
        { icon: ClipboardList, text: "Today's queue, in the order you see patients" },
        { icon: HeartPulse, text: "Triage vitals and allergies waiting in the visit" },
        { icon: Send, text: "Prescriptions and lab orders sent when you sign" },
      ]}
    >
      {children}
    </AuthShell>
  );
}
