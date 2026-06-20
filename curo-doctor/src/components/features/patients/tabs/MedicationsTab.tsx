"use client";

import { useMemo, useState } from "react";
import { Prescription, Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, formatStatus, calculateAge } from "@/lib/utils";
import { Pill, Printer } from "lucide-react";

interface MedicationsTabProps {
  prescriptions: Prescription[];
  patient: Patient;
}

export function MedicationsTab({ prescriptions, patient }: MedicationsTabProps) {
  // Flattened list of every prescribed item, each individually selectable.
  const allItems = useMemo(
    () => prescriptions.flatMap((rx) => rx.items.map((item) => ({ rx, item, key: `${rx.id}:${item.id}` }))),
    [prescriptions],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const printItems = useMemo(() => {
    const chosen = selected.size > 0 ? allItems.filter((r) => selected.has(r.key)) : allItems;
    return chosen;
  }, [allItems, selected]);

  const doPrint = (onlySelected: boolean) => {
    if (onlySelected && selected.size === 0) return;
    // printItems already reflects selection; if "print all" requested, clear selection first
    if (!onlySelected) setSelected(new Set());
    setTimeout(() => window.print(), 50);
  };

  return (
    <>
      <Card className="shadow-sm border no-print">
        <CardHeader className="bg-muted border-b flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="h-5 w-5 text-status-success-text" /> Prescriptions History
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => doPrint(true)} disabled={selected.size === 0}>
              <Printer className="h-4 w-4 mr-2" /> Print selected ({selected.size})
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => doPrint(false)} disabled={allItems.length === 0}>
              <Printer className="h-4 w-4 mr-2" /> Print all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No prescriptions on record.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground hidden md:table-header-group">
                <tr>
                  <th className="px-4 py-3 font-medium w-10"></th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Medication</th>
                  <th className="px-6 py-3 font-medium">Directions</th>
                  <th className="px-6 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allItems.map(({ rx, item, key }) => (
                  <tr key={key} className="hover:bg-muted">
                    <td className="px-4 py-4 align-top">
                      <Checkbox checked={selected.has(key)} onCheckedChange={() => toggle(key)} aria-label="Select medication" />
                    </td>
                    <td className="px-6 py-4 align-top">{formatDate(rx.createdAt)}</td>
                    <td className="px-6 py-4 align-top font-medium text-foreground">{item.displayName}</td>
                    <td className="px-6 py-4 align-top text-muted-foreground">
                      {item.dose} {item.route} {item.frequency} for {item.durationDays} days. Qty: {item.quantity}. {item.instructions}
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <Badge variant="outline" className={rx.status === "sent_to_pharmacy" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                        {formatStatus(rx.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Print-only e-prescription. Hidden on screen, shown by the print stylesheet. */}
      <div id="rx-print" className="hidden">
        <div style={{ padding: "24px", fontFamily: "serif", color: "#111" }}>
          <div style={{ borderBottom: "2px solid #1e3a8a", paddingBottom: 12, marginBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>CuroMD — e-Prescription</h1>
            <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>Generated {formatDate(new Date().toISOString())}</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13 }}>
            <div>
              <p style={{ margin: 0 }}><strong>Patient:</strong> {patient.name.full}</p>
              <p style={{ margin: "2px 0" }}><strong>MRN:</strong> {patient.mrn}{patient.phn ? `  ·  PHN: ${patient.phn}` : ""}</p>
              <p style={{ margin: 0 }}><strong>Age/Sex:</strong> {calculateAge(patient.dob)} / {patient.sex}</p>
            </div>
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
              {printItems.map(({ item, key }) => (
                <tr key={key} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px 4px", fontWeight: 600 }}>{item.displayName}</td>
                  <td style={{ padding: "6px 4px" }}>{item.dose} {item.route} {item.frequency} × {item.durationDays}d. {item.instructions}</td>
                  <td style={{ padding: "6px 4px" }}>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 48, textAlign: "right", fontSize: 13 }}>
            <div style={{ display: "inline-block", borderTop: "1px solid #111", paddingTop: 4, minWidth: 200 }}>
              Prescriber signature
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
