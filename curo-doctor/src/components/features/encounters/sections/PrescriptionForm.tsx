"use client";

import { useState } from "react";
import { PrescriptionItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pill } from "lucide-react";

interface PrescriptionFormProps {
  prescriptions: PrescriptionItem[];
  setPrescriptions: React.Dispatch<React.SetStateAction<PrescriptionItem[]>>;
}

export function PrescriptionForm({ prescriptions, setPrescriptions }: PrescriptionFormProps) {
  const [newMed, setNewMed] = useState({ name: "", dose: "", frequency: "", durationDays: 1, quantity: 1, instructions: "" });

  const addMedication = () => {
    if (!newMed.name.trim()) return;
    setPrescriptions(prev => [
      ...prev,
      {
        id: `rx-${Date.now()}`,
        medicationId: `custom-${Date.now()}`,
        displayName: newMed.name,
        dose: newMed.dose,
        route: "oral",
        frequency: newMed.frequency,
        durationDays: newMed.durationDays,
        quantity: newMed.quantity,
        instructions: newMed.instructions,
        substitutes: [],
      }
    ]);
    setNewMed({ name: "", dose: "", frequency: "", durationDays: 1, quantity: 1, instructions: "" });
  };

  const updatePrescriptionField = <K extends keyof PrescriptionItem>(
    id: string,
    field: K,
    value: PrescriptionItem[K]
  ) => {
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Pill className="h-5 w-5 text-status-success-text" /> e-Prescription
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="bg-muted border rounded-md p-4">
          <div className="flex flex-col md:flex-row items-end gap-3 flex-wrap">
            <div className="space-y-1 flex-1 w-full min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Medicine Name</Label>
              <Input value={newMed.name} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))} placeholder="e.g. Amoxicillin 500mg" className="h-9 bg-white" />
            </div>
            <div className="space-y-1 w-full md:w-24">
              <Label className="text-xs text-muted-foreground">Dose</Label>
              <Input value={newMed.dose} onChange={e => setNewMed(m => ({ ...m, dose: e.target.value }))} placeholder="500mg" className="h-9 bg-white" />
            </div>
            <div className="space-y-1 w-full md:w-28">
              <Label className="text-xs text-muted-foreground">Frequency</Label>
              <Input value={newMed.frequency} onChange={e => setNewMed(m => ({ ...m, frequency: e.target.value }))} placeholder="TID" className="h-9 bg-white" />
            </div>
            <div className="space-y-1 w-full md:w-20">
              <Label className="text-xs text-muted-foreground">Days</Label>
              <Input type="number" value={newMed.durationDays} onChange={e => setNewMed(m => ({ ...m, durationDays: parseInt(e.target.value) || 1 }))} className="h-9 bg-white" />
            </div>
            <div className="space-y-1 flex-1 w-full min-w-[150px]">
              <Label className="text-xs text-muted-foreground">Instructions</Label>
              <Input value={newMed.instructions} onChange={e => setNewMed(m => ({ ...m, instructions: e.target.value }))} placeholder="e.g. After meals" className="h-9 bg-white" />
            </div>
            <Button type="button" onClick={addMedication} className="h-9 bg-status-success-text hover:bg-status-success-text/90 shrink-0 gap-1.5">
              <Plus className="h-4 w-4" /> Add Medication
            </Button>
          </div>
        </div>

        {prescriptions.length > 0 && (
          <div className="space-y-4">
            {prescriptions.map(rx => (
              <div key={rx.id} className="p-4 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <span className="font-semibold text-foreground">{rx.displayName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setPrescriptions(prev => prev.filter(p => p.id !== rx.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  {(['dose', 'frequency'] as const).map(field => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs capitalize">{field}</Label>
                      <Input className="h-8" value={rx[field] as string} onChange={e => updatePrescriptionField(rx.id, field, e.target.value)} placeholder={field === 'dose' ? 'e.g. 500mg' : 'e.g. BID'} />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label className="text-xs">Duration (Days)</Label>
                    <Input type="number" className="h-8" value={rx.durationDays} onChange={e => updatePrescriptionField(rx.id, 'durationDays', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" className="h-8" value={rx.quantity} onChange={e => updatePrescriptionField(rx.id, 'quantity', Number(e.target.value))} />
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Label className="text-xs">Instructions (Sig)</Label>
                  <Input className="h-8" value={rx.instructions} onChange={e => updatePrescriptionField(rx.id, 'instructions', e.target.value)} placeholder="e.g. Take 1 tablet by mouth twice daily after meals" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
