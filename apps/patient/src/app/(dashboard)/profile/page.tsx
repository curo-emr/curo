"use client";

import { useState, useEffect } from "react";
import { Loader2, User, Phone, Mail, MapPin, Heart, Shield, Droplets, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { calculateAge, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { getMyProfile } from "@/lib/api/patient-portal";
import type { Patient } from "@/types";

export default function ProfilePage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyProfile().then(setPatient).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!patient) return <div className="text-center py-12 text-muted-foreground">Patient data not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="My Profile"
        description="Your personal and medical information."
      />

      {/* Patient Overview Card */}
      <Card className="shadow-sm border">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center text-primary text-2xl font-bold border-4 border-white shadow-sm shrink-0">
              {patient.name.first[0]}{patient.name.last[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{patient.name.full}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                MRN: {patient.mrn}{patient.phn ? ` · PHN: ${patient.phn}` : ""}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {calculateAge(patient.dob)} years old &middot; {formatDate(patient.dob)}
                </span>
                <span className="capitalize">{patient.sex}</span>
                <span className="flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-status-error-text" />
                  {patient.bloodType}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <SectionCard icon={User} iconClassName="text-primary" title="Personal Information">
          <div className="space-y-3 text-sm">
            {patient.nic && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">NIC</span>
                <span className="font-medium text-foreground">{patient.nic}</span>
              </div>
            )}
            {patient.nationality && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nationality</span>
                <span className="font-medium text-foreground">{patient.nationality}</span>
              </div>
            )}
            {patient.maritalStatus && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marital Status</span>
                <span className="font-medium text-foreground capitalize">{patient.maritalStatus}</span>
              </div>
            )}
            {patient.occupation && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Occupation</span>
                <span className="font-medium text-foreground">{patient.occupation}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date of Birth</span>
              <span className="font-medium text-foreground">{formatDate(patient.dob)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sex</span>
              <span className="font-medium text-foreground capitalize">{patient.sex}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blood Type</span>
              <span className="font-medium text-foreground">{patient.bloodType}</span>
            </div>
          </div>
        </SectionCard>

        {/* Contact Information */}
        <SectionCard icon={Phone} iconClassName="text-status-success-text" title="Contact Information">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground">{patient.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{patient.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium text-foreground">
                  {patient.address.line1}
                  {patient.address.line2 && `, ${patient.address.line2}`}
                </p>
                <p className="text-muted-foreground">
                  {patient.address.city}, {patient.address.district} {patient.address.postalCode}
                </p>
                <p className="text-muted-foreground">{patient.address.country}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Emergency Contact */}
        <SectionCard icon={Heart} iconClassName="text-status-error-text" title="Emergency Contact">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium text-foreground">{patient.emergencyContact.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Relationship</span>
              <span className="font-medium text-foreground">{patient.emergencyContact.relationship}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-foreground">{patient.emergencyContact.phone}</span>
            </div>
          </div>
        </SectionCard>

        {/* Insurance Information */}
        {patient.insurance && (
          <SectionCard icon={Shield} iconClassName="text-indigo-500" title="Insurance">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium text-foreground">{patient.insurance.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Policy Number</span>
                <span className="font-medium text-foreground">{patient.insurance.policyNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group Number</span>
                <span className="font-medium text-foreground">{patient.insurance.groupNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Holder</span>
                <span className="font-medium text-foreground">
                  {patient.insurance.holderName} ({patient.insurance.relationship})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expiry</span>
                <span className="font-medium text-foreground">{formatDate(patient.insurance.expiryDate)}</span>
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Account Info */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Patient since: {formatDate(patient.createdAt)}</span>
            <span>Last updated: {formatDate(patient.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
