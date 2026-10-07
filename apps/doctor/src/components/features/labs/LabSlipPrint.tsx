import type { Lab, LabOrder, Patient } from "@/types";
import { formatDate } from "@/lib/utils";

export const LAB_SLIP_PRINT_ID = "lab-slip-print";

interface LabSlipPrintProps {
  patient: Patient;
  orders: LabOrder[];
  labs: Lab[];
  /** The visit's QR: each lab scans it to find the tests sent to it. */
  qrBase64: string | null;
  doctor?: string;
  date?: string;
}

/** The visit's tests, grouped by the lab each was sent to. */
function byLab(orders: LabOrder[], labs: Lab[]) {
  const groups = new Map<string, LabOrder[]>();
  for (const o of orders) groups.set(o.labId ?? "", [...(groups.get(o.labId ?? "") ?? []), o]);
  return [...groups].map(([labId, labOrders]) => ({ lab: labs.find(l => l.id === labId), orders: labOrders }));
}

// The patient's slip for the visit's lab tests. Hidden on screen; printed with printOnly(LAB_SLIP_PRINT_ID).
export function LabSlipPrint({ patient, orders, labs, qrBase64, doctor, date }: LabSlipPrintProps) {
  return (
    <div id={LAB_SLIP_PRINT_ID} className="hidden">
      <div style={{ padding: 24, fontFamily: "sans-serif", color: "#111" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, borderBottom: "2px solid #1e3a8a", paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>CuroMD — Lab request</h1>
            <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>{formatDate(date ?? new Date().toISOString())}{doctor ? ` · Ordered by ${doctor}` : ""}</p>
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <p style={{ margin: 0 }}><strong>Patient:</strong> {patient.name.full}</p>
              <p style={{ margin: "2px 0 0" }}><strong>MRN:</strong> {patient.mrn}{patient.phn ? `  ·  PHN: ${patient.phn}` : ""}</p>
            </div>
          </div>
          {qrBase64 && (
            <div style={{ textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL QR code; next/image adds nothing */}
              <img src={qrBase64} alt="" style={{ width: 120, height: 120 }} />
              <p style={{ fontSize: 10, color: "#555", margin: 0 }}>Scan at the lab</p>
            </div>
          )}
        </div>
        {byLab(orders, labs).map(({ lab, orders: labOrders }) => (
          <div key={lab?.id ?? "none"} style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
              {lab ? lab.name : "Lab not recorded"}{lab?.city ? ` (${lab.city})` : ""}
            </h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {labOrders.map(o => (
                <li key={o.id}>
                  {o.tests.map(t => t.display).join(", ")}
                  {o.priority !== "routine" && <strong> — {o.priority.toUpperCase()}</strong>}
                  {o.notesToLab && <em> ({o.notesToLab})</em>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p style={{ fontSize: 11, color: "#555", marginTop: 16 }}>
          Take this slip to the lab. Each lab scans the code to find the tests sent to it.
        </p>
      </div>
    </div>
  );
}
