"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FlaskConical, HeartPulse, Pill, type LucideIcon } from "lucide-react";
import { greeting } from "@curo/web/format";
import { QueryContent, allOf } from "@curo/web/query";
import { SectionCard } from "@curo/web/ui/section-card";
import { MyRecord } from "@/components/features/MyRecord";
import { NextAppointmentCard } from "@/components/features/NextAppointmentCard";
import { splitAppointments } from "@/lib/appointments";
import { ROUTES } from "@/lib/constants";
import { plural } from "@/lib/format";
import { myQueries } from "@/lib/queries";
import type { Allergy, Appointment, LabTest, Medicine, Patient } from "@/types";

export default function HomePage() {
  return <MyRecord>{patient => <Home patient={patient} />}</MyRecord>;
}

function Home({ patient }: { patient: Patient }) {
  const record = allOf(
    useQuery(myQueries.appointments()),
    useQuery(myQueries.medicines(patient.id)),
    useQuery(myQueries.labTests(patient.id)),
    useQuery(myQueries.allergies(patient.id)),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {greeting()}, {patient.name.first}
      </h1>
      <QueryContent query={record} what="your record">
        {([appointments, medicines, tests, allergies]) => (
          <Summary appointments={appointments} medicines={medicines} tests={tests} allergies={allergies} />
        )}
      </QueryContent>
    </div>
  );
}

interface SummaryProps {
  appointments: Appointment[];
  medicines: Medicine[];
  tests: LabTest[];
  allergies: Allergy[];
}

function Summary({ appointments, medicines, tests, allergies }: SummaryProps) {
  const [next] = splitAppointments(appointments).upcoming;
  const toCollect = medicines.filter(m => m.status === "to_collect" || m.status === "on_hold").length;
  const waiting = tests.filter(t => t.status === "ordered" || t.status === "in_lab").length;
  const ready = tests.filter(t => t.status === "done").length;

  return (
    <>
      <NextAppointmentCard appointment={next} />
      <SectionCard title="Your record" noPadding>
        <ul className="divide-y">
          <SummaryRow icon={Pill} href={ROUTES.MEDICINES} title="Medicines"
            detail={toCollect ? `${plural(toCollect, "medicine")} to collect` : "Nothing to collect"} />
          <SummaryRow icon={FlaskConical} href={ROUTES.TEST_RESULTS} title="Test results"
            detail={[ready && `${plural(ready, "result")} in`, waiting && `${waiting} waiting`].filter(Boolean).join(" · ") || "No lab tests yet"} />
          <SummaryRow icon={HeartPulse} href={ROUTES.MY_HEALTH} title="My health"
            detail={allergies.length ? `Allergies: ${allergies.map(a => a.substance).join(", ")}` : "No known allergies"} />
        </ul>
      </SectionCard>
    </>
  );
}

function SummaryRow({ icon: Icon, href, title, detail }: { icon: LucideIcon; href: string; title: string; detail: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">{title}</span>
          <span className="block truncate text-sm text-muted-foreground">{detail}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
