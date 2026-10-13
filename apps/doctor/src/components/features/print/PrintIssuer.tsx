import { useQuery } from "@tanstack/react-query";
import type { Practitioner } from "@curo/web/practitioners";
import type { Organization } from "@/lib/api/directory";
import { directoryQueries, practitionerQueries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

/** Who a printout is from: the doctor, and the clinic they work at. Either is absent while loading or when not on file. */
export interface PrintIssuer {
  doctor?: Practitioner;
  clinic?: Organization;
}

/** The doctor with `practitionerId` and their clinic, to head and sign a printout with. */
export function usePrintIssuer(practitionerId: string | null | undefined): PrintIssuer {
  const doctor = useQuery({
    ...practitionerQueries.byRole("DOCTOR"),
    enabled: !!practitionerId,
    select: doctors => doctors.find(d => d.id === practitionerId),
  }).data;
  const clinicId = doctor?.organizationId;
  const clinic = useQuery({ ...directoryQueries.organization(clinicId ?? ""), enabled: !!clinicId }).data;
  return { doctor, clinic };
}

/** A printout's heading: the clinic and how to reach it, then what the printout is and its date. */
export function PrintLetterhead({ clinic, title, date }: { clinic?: Organization; title: string; date?: string }) {
  const contact = [clinic?.addressLine1, clinic?.city, clinic?.phone && `Tel ${clinic.phone}`].filter(Boolean).join(" · ");
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>{clinic?.name ?? "CuroMD"}</h1>
      {contact && <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>{contact}</p>}
      <p style={{ fontSize: 14, fontWeight: 600, margin: "8px 0 0" }}>
        {title} <span style={{ fontWeight: 400, color: "#555" }}>· {formatDate(date ?? new Date().toISOString())}</span>
      </p>
    </div>
  );
}

/** The doctor's name and the credentials a printout is signed or requested with. */
export function DoctorCredentials({ doctor }: { doctor: Practitioner }) {
  const credentials = [doctor.qualification, doctor.specialization].filter(Boolean).join(" · ");
  return (
    <>
      <p style={{ margin: 0, fontWeight: 600 }}>Dr. {doctor.name.full}</p>
      {credentials && <p style={{ margin: 0 }}>{credentials}</p>}
      {doctor.licenseNumber && <p style={{ margin: 0 }}>Reg. No. {doctor.licenseNumber}</p>}
    </>
  );
}
