import { splitByPharmacy } from "@/components/features/encounters/visit";
import type { Patient, PrescriptionItem } from "@/types";
import { calculateAge, formatStatus } from "@curo/web/format";
import { DoctorCredentials, PrintLetterhead, type PrintIssuer } from "@/components/features/print/PrintIssuer";

interface RxPrintProps {
  patient: Patient;
  items: PrescriptionItem[];
  /** The prescribing doctor and their clinic. */
  issuer: PrintIssuer;
  date?: string;
}

export const RX_PRINT_ID = "rx-print";

// Print-only e-prescription. Hidden on screen; printed with printOnly(RX_PRINT_ID).
export function RxPrint({ patient, items, issuer, date }: RxPrintProps) {
  return (
    <div id={RX_PRINT_ID} className="hidden">
      <div style={{ padding: 24, fontFamily: "serif", color: "#111" }}>
        <div style={{ borderBottom: "2px solid #1e3a8a", paddingBottom: 12, marginBottom: 16 }}>
          <PrintLetterhead clinic={issuer.clinic} title="e-Prescription" date={date} />
        </div>
        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <p style={{ margin: 0 }}><strong>Patient:</strong> {patient.name.full}</p>
          <p style={{ margin: "2px 0" }}><strong>MRN:</strong> {patient.mrn}{patient.phn ? `  ·  PHN: ${patient.phn}` : ""}</p>
          <p style={{ margin: 0 }}><strong>Age/Sex:</strong> {calculateAge(patient.dob) ?? "—"} / {formatStatus(patient.sex)}</p>
        </div>
        {rxSections(items).map(section => (
          <section key={section.title} style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{section.title}</h2>
            <RxTable items={section.rows} />
          </section>
        ))}
        <div style={{ marginTop: 48, textAlign: "right", fontSize: 13 }}>
          <div style={{ display: "inline-block", borderTop: "1px solid #111", paddingTop: 4, minWidth: 200 }}>
            {issuer.doctor ? <DoctorCredentials doctor={issuer.doctor} /> : "Prescriber signature"}
          </div>
        </div>
      </div>
    </div>
  );
}

/** "500mg oral BD × 5 days. After meals" */
export function rxDirections(item: PrescriptionItem): string {
  const main = [item.dose, item.route, item.frequency].filter(Boolean).join(" ");
  const days = item.durationDays ? ` × ${item.durationDays} days` : "";
  return `${main}${days}${item.instructions ? `. ${item.instructions}` : ""}`;
}

/** What the pharmacy here dispenses, then what the patient buys at a pharmacy of their choice; empty ones left out. */
function rxSections(items: PrescriptionItem[]) {
  const { toPharmacy, outside } = splitByPharmacy(items);
  return [
    { title: "℞ Medications", rows: toPharmacy },
    { title: "℞ Buy at any pharmacy", rows: outside },
  ].filter(section => section.rows.length > 0);
}

function RxTable({ items }: { items: PrescriptionItem[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid #999" }}>
          <th style={{ padding: "6px 4px" }}>Medication</th>
          <th style={{ padding: "6px 4px" }}>Directions</th>
          <th style={{ padding: "6px 4px" }}>Qty</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={`${item.id}-${i}`} style={{ borderBottom: "1px solid #ddd" }}>
            <td style={{ padding: "6px 4px", fontWeight: 600 }}>{item.displayName}</td>
            <td style={{ padding: "6px 4px" }}>{rxDirections(item)}</td>
            <td style={{ padding: "6px 4px" }}>{item.quantity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
