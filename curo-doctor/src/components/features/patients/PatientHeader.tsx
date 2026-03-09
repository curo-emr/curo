"use client";

import { useState } from "react";
import { Patient, Allergy } from "@/types";
import { ROUTES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, Phone, MapPin, Droplet, Plus, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface PatientHeaderProps {
  patient: Patient;
  allergies: Allergy[];
  age: number;
}

export function PatientHeader({ patient, allergies, age }: PatientHeaderProps) {
  const [showEmergencyContact, setShowEmergencyContact] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="flex gap-6 items-start">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-4 border-white shadow-sm">
            <User className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-foreground">{patient.name.full}</h1>
              <Badge variant="outline" className="text-muted-foreground font-mono tracking-wide">{patient.mrn}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-1.5"><User className="h-4 w-4 text-muted-foreground" /> {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)} &bull; {age}y ({patient.dob})</div>
              <div className="flex items-center gap-1.5"><Droplet className="h-4 w-4 text-status-error-text" /> Blood: {patient.bloodType}</div>
              <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted-foreground" /> {patient.phone}</div>
              <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" /> {patient.address.city}</div>
            </div>

            {/* Patient Tags */}
            {patient.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {patient.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs text-muted-foreground bg-muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <Link href={ROUTES.EDIT_PATIENT(patient.id)}>
            <Button variant="outline" className="shadow-sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Demographics
            </Button>
          </Link>
          <Link href={ROUTES.NEW_ENCOUNTER(patient.id)}>
            <Button className="bg-primary hover:bg-primary/90 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Start Visit
            </Button>
          </Link>
        </div>
      </div>

      {/* Clinical Alerts */}
      {allergies.length > 0 && (
        <div className="mt-6 p-4 bg-status-error-bg border border-status-error-border rounded-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-status-error-text shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-status-error-text tracking-tight text-sm">Allergies on Record</h4>
            <p className="text-sm text-status-error-text mt-0.5">
              {allergies.map(a => `${a.substance} (${a.reaction})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      {patient.emergencyContact && (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground px-2 h-7 gap-1"
            onClick={() => setShowEmergencyContact(!showEmergencyContact)}
          >
            {showEmergencyContact ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Emergency Contact
          </Button>
          {showEmergencyContact && (
            <div className="mt-2 ml-2 p-3 bg-muted border rounded-md text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium text-foreground">Name:</span> {patient.emergencyContact.name}</p>
              <p><span className="font-medium text-foreground">Relationship:</span> {patient.emergencyContact.relationship}</p>
              <p className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">Phone:</span> {patient.emergencyContact.phone}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
