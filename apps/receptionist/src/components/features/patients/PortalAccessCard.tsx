"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, KeyRound, MonitorSmartphone } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { Button } from "@curo/web/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { PasswordDialog } from "@curo/web/ui/password";
import { givePortalAccess, resetPortalPassword, type PortalAccess } from "@/lib/api/portal-access";
import { patientQueries } from "@/lib/queries";
import { ROUTES } from "@/lib/constants";
import type { Patient } from "@/types";

/** Whether the patient can sign in to the patient portal, with a way to give or reset their sign-in. */
export function PortalAccessCard({ patient }: { patient: Patient }) {
  const access = useQuery(patientQueries.portalAccess(patient.id));

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b border pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
          Patient portal
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <QueryContent query={access} what="portal access">
          {({ login }) => <PortalAccessState patient={patient} login={login} />}
        </QueryContent>
      </CardContent>
    </Card>
  );
}

function PortalAccessState({ patient, login }: { patient: Patient; login: PortalAccess["login"] }) {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries(patientQueries.portalAccess(patient.id));
  const name = patient.name.full;

  if (!login && !patient.email) {
    return (
      <Row text="No email on their record. Add one to give them portal access: they sign in with it.">
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.PATIENT_EDIT(patient.id)}><Edit /> Add email</Link>
        </Button>
      </Row>
    );
  }

  if (!login) {
    return (
      <Row text={<>Not set up. They&apos;d sign in with <Email>{patient.email}</Email>.</>}>
        <PasswordDialog
          trigger={<Button size="sm"><KeyRound /> Give portal access</Button>}
          title={`Give ${name} portal access`}
          description="They can see their appointments, visits, medicines and test results."
          submitLabel="Give access"
          doneTitle={`${name} can now sign in`}
          email={patient.email}
          save={password => givePortalAccess(patient.id, password)}
          onDone={refresh}
        />
      </Row>
    );
  }

  if (!login.isActive) {
    return <Row text={<>Their sign-in, <Email>{login.email}</Email>, is suspended. An admin can restore it.</>} />;
  }

  return (
    <Row
      text={
        <>
          Signs in with <Email>{login.email}</Email>.
          {patient.email && patient.email !== login.email && <> Their record now says {patient.email}; the sign-in hasn&apos;t changed.</>}
        </>
      }
    >
      <PasswordDialog
        trigger={<Button variant="outline" size="sm"><KeyRound /> Reset password</Button>}
        title={`Reset ${name}'s portal password`}
        description="Their old password stops working straight away, and they're signed out everywhere."
        submitLabel="Reset password"
        doneTitle={`Password reset for ${name}`}
        email={login.email}
        save={password => resetPortalPassword(patient.id, password)}
      />
    </Row>
  );
}

function Row({ text, children }: { text: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{text}</p>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function Email({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground break-all">{children}</span>;
}
