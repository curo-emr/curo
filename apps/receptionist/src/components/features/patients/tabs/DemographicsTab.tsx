import Link from "next/link";
import { Patient } from "@/types";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { formatStatus } from "@curo/web/format";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { Edit, User, Phone, MapPin, Shield } from "lucide-react";

interface DemographicsTabProps {
  patient: Patient;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col space-y-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "-"}</span>
    </div>
  );
}

export function DemographicsTab({ patient }: DemographicsTabProps) {
  const formattedAddress = [
    patient.address.line1,
    patient.address.line2,
    patient.address.city,
    patient.address.district,
    patient.address.postalCode,
    patient.address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Personal Information
          </CardTitle>
          <Link href={ROUTES.PATIENT_EDIT(patient.id)}>
            <Button variant="ghost" size="sm" className="text-muted-foreground h-7">
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
            <InfoRow label="Personal Health Number" value={patient.phn} />
            <InfoRow label="NIC / Passport" value={patient.nic || "—"} />
            <InfoRow label="Date of Birth" value={formatDate(patient.dob)} />
            <InfoRow
              label="Sex"
              value={
                patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)
              }
            />
            <InfoRow label="Blood Type" value={patient.bloodType} />
            <InfoRow label="Nationality" value={patient.nationality} />
            <InfoRow label="Marital Status" value={formatStatus(patient.maritalStatus ?? "")} />
            <InfoRow label="Occupation" value={patient.occupation} />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Email" value={patient.email} />
            <div className="md:col-span-3 flex flex-col space-y-0.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Address
              </span>
              <span className="text-sm text-foreground">
                {formattedAddress || "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border pb-3">
          <CardTitle className="text-base">Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {patient.emergencyContact ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
              <InfoRow label="Name" value={patient.emergencyContact.name} />
              <InfoRow
                label="Relationship"
                value={patient.emergencyContact.relationship}
              />
              <InfoRow label="Phone" value={patient.emergencyContact.phone} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No emergency contact on file.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Insurance */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Insurance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {patient.insurance ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
              <InfoRow label="Provider" value={patient.insurance.provider} />
              <InfoRow
                label="Policy Number"
                value={patient.insurance.policyNumber}
              />
              <InfoRow
                label="Group Number"
                value={patient.insurance.groupNumber}
              />
              <InfoRow
                label="Expiry Date"
                value={
                  patient.insurance.expiryDate
                    ? formatDate(patient.insurance.expiryDate)
                    : ""
                }
              />
              <InfoRow
                label="Holder Name"
                value={patient.insurance.holderName}
              />
              <InfoRow
                label="Relationship"
                value={
                  patient.insurance.relationship
                    ? patient.insurance.relationship.charAt(0).toUpperCase() +
                      patient.insurance.relationship.slice(1)
                    : ""
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No insurance on file.</p>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      {patient.tags.length > 0 && (
        <Card className="shadow-sm border">
          <CardHeader className="bg-muted/50 border-b border pb-3">
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-2">
              {patient.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs text-muted-foreground bg-muted"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
