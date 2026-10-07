import type { Patient, PrescriptionItem } from "@/types";
import { calculateAge, formatDate, formatSex } from "@/lib/utils";

interface RxPrintProps {
  patient: Patient;
  items: PrescriptionItem[];
  prescriber?: string;
  date?: string;
}

export const RX_PRINT_ID = "rx-print";

// Print-only e-prescription. Hidden on screen; printed with printOnly(RX_PRINT_ID).
export function RxPrint({ patient, items, prescriber, date }: RxPrintProps) {
  return (
    <div id={RX_PRINT_ID} className="hidden">
      <div style={{ padding: 24, fontFamily: "serif", color: "#111" }}>
        <div style={{ borderBottom: "2px solid #1e3a8a", paddingBottom: 12, marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>CuroMD — e-Prescription</h1>
          <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>{formatDate(date ?? new Date().toISOString())}</p>
        </div>
        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <p style={{ margin: 0 }}><strong>Patient:</strong> {patient.name.full}</p>
          <p style={{ margin: "2px 0" }}><strong>MRN:</strong> {patient.mrn}{patient.phn ? `  ·  PHN: ${patient.phn}` : ""}</p>
          <p style={{ margin: 0 }}><strong>Age/Sex:</strong> {calculateAge(patient.dob)} / {formatSex(patient.sex)}</p>
        </div>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>℞ Medications</h2>
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
        <div style={{ marginTop: 48, textAlign: "right", fontSize: 13 }}>
          <div style={{ display: "inline-block", borderTop: "1px solid #111", paddingTop: 4, minWidth: 200 }}>
            {prescriber ? `Dr. ${prescriber}` : "Prescriber signature"}
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
