import { CalendarDays, FlaskConical, Pill } from "lucide-react";
import { AuthShell } from "@curo/web/shell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthShell
      portal="Patient Portal"
      headline="Your health record,"
      accent="whenever you need it."
      tagline="See what your clinic has on record for you: your appointments, visits, medicines and test results."
      features={[
        { icon: CalendarDays, text: "Your upcoming appointments and past visits" },
        { icon: Pill, text: "Which medicines are waiting at the pharmacy, and how to take them" },
        { icon: FlaskConical, text: "Your test results, once the lab sends them" },
      ]}
    >
      {children}
    </AuthShell>
  );
}
