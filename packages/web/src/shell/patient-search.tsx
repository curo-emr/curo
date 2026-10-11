"use client";

import { formatAgeSex } from "../format";
import { QuickFind } from "./quick-find";

/** What a search result needs to show. */
export interface PatientHit {
  id: string;
  name: { full: string };
  dob?: string | null;
  sex?: string | null;
  mrn?: string | null;
  phone?: string | null;
}

interface PatientSearchProps {
  /** Patients matching a name, MRN, phone or NIC. */
  search: (text: string) => Promise<PatientHit[]>;
  /** Where picking a patient goes, e.g. their chart. */
  href: (patientId: string) => string;
}

// The ⌘K patient finder for the top bar. Picking a result opens that patient.
export function PatientSearch({ search, href }: PatientSearchProps) {
  return (
    <QuickFind
      label="Find a patient"
      placeholder="Search by name, MRN, phone or NIC…"
      heading="Patients"
      // Under "patients", so registering or editing one refreshes the results.
      queryKey={["patients", "find"]}
      search={async text =>
        (await search(text)).map(p => ({
          id: p.id,
          name: p.name.full,
          detail: [formatAgeSex(p.dob, p.sex), p.mrn, p.phone].filter(Boolean).join(" · "),
        }))
      }
      href={href}
    />
  );
}
