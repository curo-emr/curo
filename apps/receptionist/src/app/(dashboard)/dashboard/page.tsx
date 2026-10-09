"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarPlus, CalendarX, UserPlus } from "lucide-react";
import { useAuth } from "@curo/web/auth";
import { FlowOverview, countStages } from "@curo/web/flow";
import { greeting } from "@curo/web/format";
import { QueryContent } from "@curo/web/query";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { NextArrivalCard } from "@/components/features/dashboard/NextArrivalCard";
import { StillToArrive } from "@/components/features/dashboard/StillToArrive";
import { useDoctors } from "@/lib/hooks/useDoctors";
import { useFrontDeskActions } from "@/lib/hooks/useFrontDeskActions";
import { appointmentQueries, patientQueries } from "@/lib/queries";
import { isExpected, isMissed, type Arrival } from "@/lib/queue";
import { ROUTES } from "@/lib/constants";
import { getDoctorName, getPatientName, getTodayString } from "@/lib/utils";
import type { Appointment, Patient } from "@/types";

const NONE: Patient[] = [];

// The day at a glance and the next patient to check in; the checked-in patients are on the queue board.
export default function DashboardPage() {
  const { user } = useAuth();
  const today = useQuery(appointmentQueries.day(getTodayString()));
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={`${greeting()}${firstName ? `, ${firstName}` : ""}`} description={dateLabel}>
        <Button asChild variant="outline">
          <Link href={ROUTES.NEW_PATIENT}><UserPlus /> Register patient</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.NEW_APPOINTMENT}><CalendarPlus /> Book appointment</Link>
        </Button>
      </PageHeader>

      <QueryContent query={today} what="today's appointments">
        {appointments => <Today appointments={appointments} />}
      </QueryContent>
    </div>
  );
}

function Today({ appointments }: { appointments: Appointment[] }) {
  const patients = useQuery(patientQueries.byIds(appointments.map(a => a.patientId))).data ?? NONE;
  const doctors = useDoctors();
  const { checkIn, pendingId } = useFrontDeskActions();

  // Cancellations and no-shows are neither here nor still expected, so they're counted apart.
  const booked = appointments.filter(a => !isMissed(a));
  const missed = appointments.length - booked.length;
  // In appointment order, so anyone running late comes first.
  const expected: Arrival[] = booked.filter(isExpected).map(appointment => ({
    appointment,
    patient: patients.find(p => p.id === appointment.patientId),
    patientName: getPatientName(appointment.patientId, patients),
    doctorName: getDoctorName(appointment.doctorId, doctors),
  }));
  const [next, ...later] = expected;
  const onCheckIn = (arrival: Arrival) => checkIn(arrival.appointment, arrival.patientName);

  if (booked.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarX}
          title="No appointments today"
          description="Patients booked for today appear here, ready to check in."
          action={<Button asChild variant="outline" size="sm"><Link href={ROUTES.NEW_APPOINTMENT}>Book appointment</Link></Button>}
        />
      </Card>
    );
  }

  return (
    <>
      <FlowOverview
        notArrived={expected.length}
        counts={countStages(booked.map(a => a.queueStage))}
        summary={
          <>
            <span className="text-2xl font-semibold tabular-nums text-foreground">{booked.length - expected.length}</span>
            <span className="tabular-nums">of {booked.length} arrived</span>
            {missed > 0 && <span className="text-xs tabular-nums">· {missed} cancelled or no-show</span>}
          </>
        }
      />
      {expected.length > 0 ? (
        <NextArrivalCard arrival={next} pending={pendingId === next.appointment.id} onCheckIn={() => onCheckIn(next)}>
          <StillToArrive arrivals={later} pendingId={pendingId} onCheckIn={onCheckIn} />
        </NextArrivalCard>
      ) : (
        <Card>
          <EmptyState
            icon={CalendarCheck}
            title="Everyone booked for today has arrived"
            description="Follow them through triage to the doctor on the queue board."
            action={<Button asChild variant="outline" size="sm"><Link href={ROUTES.QUEUE}>Open queue board</Link></Button>}
          />
        </Card>
      )}
    </>
  );
}
