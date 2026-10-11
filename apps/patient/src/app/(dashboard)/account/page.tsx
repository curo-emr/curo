"use client";

import { calculateAge, formatStatus } from "@curo/web/format";
import { AccountProfile } from "@curo/web/shell";
import { PageHeader } from "@curo/web/ui/page-header";
import { useAuth } from "@curo/web/auth";
import { MyRecord } from "@/components/features/MyRecord";
import { RECEPTION } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Patient } from "@/types";

export default function AccountPage() {
  const { logout } = useAuth();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My details" description="What your clinic has on record about you." />
      <MyRecord>{patient => <AccountProfile name={patient.name.full} fields={fieldsOf(patient)} contact={RECEPTION} onSignOut={logout} />}</MyRecord>
    </div>
  );
}

function fieldsOf(p: Patient) {
  const { name, relationship, phone } = p.emergencyContact;
  return [
    { label: "Full name", value: p.name.full },
    { label: "Patient number", value: p.mrn },
    { label: "Date of birth", value: p.dob && `${formatDate(p.dob)} (age ${calculateAge(p.dob)})` },
    { label: "Sex", value: p.sex && formatStatus(p.sex) },
    { label: "Blood group", value: p.bloodType },
    { label: "Personal Health Number", value: p.phn },
    { label: "NIC", value: p.nic },
    { label: "Phone", value: p.phone },
    { label: "Email", value: p.email },
    { label: "Address", value: p.address },
    { label: "Emergency contact", value: [name, relationship && `(${relationship})`, phone].filter(Boolean).join(" ") },
  ];
}
