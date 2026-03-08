"use client";

import { useState } from "react";
import Link from "next/link";
import { Patient, Allergy } from "@/types";
import { ROUTES } from "@/lib/constants";
import { calculateAge } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  User,
  Phone,
  Edit,
  CalendarPlus,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PatientHeaderProps {
  patient: Patient;
  allergies: Allergy[];
}

export function PatientHeader({ patient, allergies }: PatientHeaderProps) {
  const [showEmergencyContact, setShowEmergencyContact] = useState(false);
  const age = calculateAge(patient.dob);

  const initials =
    (patient.name.first?.[0] || "") + (patient.name.last?.[0] || "");

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="flex gap-6 items-start">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-4 border-white shadow-sm">
            <span className="text-2xl font-bold text-primary">
              {initials.toUpperCase()}
            </span>
          </div>

          <div className="space-y-1">
            {/* Name + MRN */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-foreground">
                {patient.name.full}
              </h1>
              <Badge
                variant="outline"
                className="text-muted-foreground font-mono tracking-wide"
              >
                {patient.mrn}
              </Badge>
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
              <span>{patient.nic}</span>
              <span className="text-border">|</span>
              <span>
                {patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)}
              </span>
              <span className="text-border">|</span>
              <span>{age}y</span>
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
        <div className="flex gap-3 shrink-0">
          <Link href={ROUTES.PATIENT_EDIT(patient.id)}>
            <Button variant="outline" className="shadow-sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Demographics
            </Button>
          </Link>
          <Link href={`${ROUTES.NEW_APPOINTMENT}?patientId=${patient.id}`}>
            <Button className="bg-primary hover:bg-primary/90 shadow-sm">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Allergy Alert Banner */}
      {allergies.length > 0 && (
        <div className="mt-6 p-4 bg-status-error-bg border border-status-error-border rounded-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-status-error-text shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-status-error-text tracking-tight text-sm">
              Allergies on Record
            </h4>
            <p className="text-sm text-status-error-text mt-0.5">
              {allergies
                .map((a) => `${a.substance} (${a.reaction})`)
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
