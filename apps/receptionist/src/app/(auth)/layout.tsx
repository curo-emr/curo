import { CalendarPlus, ListOrdered, UserPlus } from "lucide-react";
import { AuthShell } from "@curo/web/shell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthShell
      portal="Front Desk"
      headline="Every patient welcomed,"
      accent="booked and checked in."
      tagline="Register patients, book them with a doctor, and check them in when they arrive."
      features={[
        { icon: UserPlus, text: "Register patients with their allergies and contacts" },
        { icon: CalendarPlus, text: "Book appointments in each doctor's free slots" },
        { icon: ListOrdered, text: "Check patients in and follow them to the doctor" },
      ]}
    >
      {children}
    </AuthShell>
  );
}
