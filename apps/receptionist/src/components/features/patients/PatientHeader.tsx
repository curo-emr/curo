"use client";

import { useState } from "react";
import Link from "next/link";
import { Patient, Allergy } from "@/types";
import { ROUTES } from "@/lib/constants";
import { formatAgeSex } from "@curo/web/format";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { AlertTriangle, Phone, Edit, CalendarPlus, Shield, ChevronDown, ChevronUp } from "lucide-react";

interface PatientHeaderProps {
  patient: Patient;
  /** Null when they couldn't be loaded, which must never read as none; undefined while they load. */
  allergies: Allergy[] | null | undefined;
}

export function PatientHeader({ patient, allergies }: PatientHeaderProps) {
  const [showEmergencyContact, setShowEmergencyContact] = useState(false);
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="flex gap-6 items-start">
          <InitialsAvatar name={patient.name.full} size="xl" />

          <div className="space-y-1">
            {/* Name + MRN */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {patient.name.full}
              </h1>
              <Badge
                variant="outline"
                className="text-muted-foreground font-mono tracking-wide"
              >
                {patient.mrn}
              </Badge>
              {patient.phn && (
                <Badge
                  variant="outline"
                  className="text-muted-foreground font-mono tracking-wide"
                  title="Personal Health Number"
                >
                  PHN {patient.phn}
                </Badge>
              )}
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
              {patient.nic && (
                <>
                  <span>{patient.nic}</span>
                  <span className="text-border">|</span>
                </>
              )}
              <span>{formatAgeSex(patient.dob, patient.sex)}</span>
              {patient.bloodType && (
                <>
                  <span className="text-border">|</span>
                  <span>{patient.bloodType}</span>
                </>
              )}
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {patient.phone}
              </span>
            </div>

            {/* Insurance indicator */}
            <div className="mt-2">
              {patient.insurance ? (
                <Badge
                  variant="secondary"
                  className="bg-status-success-bg text-status-success-text border-status-success-border hover:bg-status-success-bg"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Insured
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground border hover:bg-muted"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  No Insurance
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild variant="outline">
            <Link href={ROUTES.PATIENT_EDIT(patient.id)}>
              <Edit /> Edit details
            </Link>
          </Button>
          <Button asChild>
            <Link href={`${ROUTES.NEW_APPOINTMENT}?patientId=${patient.id}`}>
              <CalendarPlus /> Book appointment
            </Link>
          </Button>
        </div>
      </div>

      {/* Allergy Alert Banner */}
      {allergies === null && (
        <div className="mt-6 p-4 bg-status-warning-bg border border-status-warning-border rounded-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-status-warning-text shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-status-warning-text">Allergies couldn&apos;t be loaded</p>
        </div>
      )}
      {allergies && allergies.length > 0 && (
        <div className="mt-6 p-4 bg-status-error-bg border border-status-error-border rounded-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-status-error-text shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-status-error-text tracking-tight text-sm">
              Allergies on Record
            </h4>
            <p className="text-sm text-status-error-text mt-0.5">
              {allergies
                .map((a) => (a.reaction ? `${a.substance} (${a.reaction})` : a.substance))
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Emergency Contact (expandable) */}
      {patient.emergencyContact && (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground px-2 h-7 gap-1"
            onClick={() => setShowEmergencyContact(!showEmergencyContact)}
          >
            {showEmergencyContact ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Emergency Contact
          </Button>
          {showEmergencyContact && (
            <div className="mt-2 ml-2 p-3 bg-muted border rounded-md text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground">Name:</span>{" "}
                {patient.emergencyContact.name}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Relationship:
                </span>{" "}
                {patient.emergencyContact.relationship}
              </p>
              <p className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">Phone:</span>{" "}
                {patient.emergencyContact.phone}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
