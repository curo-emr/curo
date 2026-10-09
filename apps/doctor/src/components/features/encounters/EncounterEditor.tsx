"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, CloudCheck, FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Lab, LabTestCatalogItem, Medication, Patient } from "@/types";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { PatientAvatar } from "@/components/ui/PatientAvatar";
import { AllergyChips } from "@/components/features/patients/AllergyChips";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@curo/web/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/constants";
import { formatRelative } from "@curo/web/format";
import { formatAgeSex } from "@/lib/utils";
import { readDraft, removeDraft, visitDraftKey, writeDraft } from "@/lib/visit";
import { getVitalsByAppointment } from "@/lib/api/clinical";
import { updateQueueStage } from "@/lib/api/appointments";
import { getPractitioners } from "@/lib/api/practitioners";

import { ClinicalNotes } from "./sections/ClinicalNotes";
import { DiagnosisSearch } from "./sections/DiagnosisSearch";
import { PrescriptionForm } from "./sections/PrescriptionForm";
import { LabOrderForm } from "./sections/LabOrderForm";
import { VitalsPanel, type RecordedVitals } from "./sections/VitalsPanel";
import { PatientContext } from "./PatientContext";
import { emptyVisit, signVisit, type VisitDraft } from "./visit";
import { apiErrorMessage } from "@curo/web/api";
import { invalidateAfterVisit } from "@/lib/queries";

interface Props {
  patient: Patient;
  appointmentId?: string;
  /** Shown in the prescription search before the doctor types. */
  medicationSuggestions: Medication[];
  labTestsCatalog: LabTestCatalogItem[];
  labs: Lab[];
}

type StoredDraft = VisitDraft & { savedAt?: string };

export function EncounterEditor({
  patient, appointmentId, medicationSuggestions, labTestsCatalog, labs,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const draftKey = visitDraftKey(user?.id ?? "anon", patient.id, appointmentId);

  // ─── Visit state + autosave ────────────────────────────────────────────────
  const [restored] = useState(() => readDraft<StoredDraft>(draftKey));
  const [visit, setVisit] = useState<VisitDraft>(() => (restored ? { ...emptyVisit(), ...restored } : emptyVisit()));
  const [savedAt, setSavedAt] = useState<string | null>(restored?.savedAt ?? null);
  const visitRef = useRef(visit);
  const dirty = useRef(false);
  const signed = useRef(false);
  const [triage, setTriage] = useState<RecordedVitals | null>(null);

  const update = useCallback(<K extends keyof VisitDraft>(key: K, value: VisitDraft[K]) => {
    dirty.current = true;
    setVisit(v => ({ ...v, [key]: value }));
  }, []);

  useEffect(() => {
    visitRef.current = visit;
    if (!dirty.current || signed.current) return;
    const t = setTimeout(() => {
      if (signed.current) return; // the visit was signed while this save was pending
      const at = new Date().toISOString();
      writeDraft(draftKey, { ...visit, savedAt: at });
      setSavedAt(at);
    }, 600);
    return () => clearTimeout(t);
  }, [visit, draftKey]);

  const discardDraft = useCallback(() => {
    const backup = visitRef.current;
    removeDraft(draftKey);
    dirty.current = false;
    setSavedAt(null);
    setVisit({ ...emptyVisit(), vitals: triage?.vitals ?? {} });
    toast("Draft discarded", {
      id: "draft",
      action: { label: "Undo", onClick: () => { dirty.current = true; setVisit(backup); } },
    });
  }, [draftKey, triage]);

  useEffect(() => {
    if (!restored) return;
    toast("Restored your unsigned draft", {
      id: "draft",
      description: `Last saved ${formatRelative(restored.savedAt ?? Date.now())}`,
    });
  }, [restored]);

  // ─── Appointment: mark "with doctor" and prefill nurse triage vitals ────────
  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;
    // Best effort — only drives queue displays; a refused transition (e.g. visit already done) is harmless.
    updateQueueStage(appointmentId, "with_doctor").catch(() => {});
    (async () => {
      const recorded = await getVitalsByAppointment(appointmentId);
      if (!recorded || cancelled) return;
      const nurses = recorded.recordedById ? await getPractitioners("NURSE").catch(() => []) : [];
      if (cancelled) return;
      setTriage({
        vitals: recorded.vitals,
        recordedBy: nurses.find(n => n.id === recorded.recordedById)?.name.full ?? "Nursing staff",
        recordedAt: recorded.recordedAt,
      });
      // The doctor's own (draft) readings win over triage.
      setVisit(v => ({ ...v, vitals: { ...recorded.vitals, ...v.vitals } }));
    })().catch(() => toast.error("Could not load triage vitals"));
    return () => { cancelled = true; };
  }, [appointmentId]);

  // ─── Sign ──────────────────────────────────────────────────────────────────
  const ccRef = useRef<HTMLInputElement>(null);
  const [ccInvalid, setCcInvalid] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  const requestSign = () => {
    if (!visit.chiefComplaint.trim()) {
      setCcInvalid(true);
      ccRef.current?.focus({ preventScroll: true });
      ccRef.current?.scrollIntoView({ block: "start" });
      toast.error("Add the chief complaint before signing");
      return;
    }
    if (visit.labTests.some(t => !t.labId)) {
      document.getElementById("labs")?.scrollIntoView({ block: "start" });
      toast.error("Choose a lab for every test before signing");
      return;
    }
    setConfirmOpen(true);
  };

  const sign = async () => {
    setConfirmOpen(false);
    setSigning(true);
    try {
      const { encounterId, appointmentClosed } = await signVisit(visitRef.current, {
        patientId: patient.id,
        appointmentId,
        triageVitals: triage?.vitals,
      });
      signed.current = true;
      removeDraft(draftKey);
      void invalidateAfterVisit(queryClient, patient.id);
      toast.success("Visit signed", {
        description: `${patient.name.full}${visit.prescriptions.length ? ` · ${visit.prescriptions.length} Rx sent to pharmacy` : ""}${visit.labTests.length ? ` · ${visit.labTests.length} lab test${visit.labTests.length > 1 ? "s" : ""} ordered` : ""}`,
        action: { label: "View summary", onClick: () => router.push(ROUTES.ENCOUNTER(patient.id, encounterId)) },
      });
      if (!appointmentClosed) toast.warning("Visit signed, but the appointment couldn't be marked complete — ask reception to close it.");
      router.push(appointmentId ? ROUTES.DASHBOARD : ROUTES.PATIENT(patient.id));
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, "Could not sign the visit");
      toast.error(msg, { description: "Your notes are saved. Sign again to finish — nothing will be sent twice." });
      setSigning(false);
    }
  };

  const backHref = appointmentId ? ROUTES.DASHBOARD : ROUTES.PATIENT(patient.id);

  return (
    <div className="space-y-6">
      {/* Patient banner — stays visible while documenting */}
      <div className="sticky top-0 z-20 -mx-4 -mt-6 bg-surface/95 px-4 pt-4 pb-3 backdrop-blur lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-6">
        <Link href={backHref} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {appointmentId ? "Today" : "Patient chart"}
        </Link>
        <Card className="flex-row flex-wrap items-center gap-4 px-5 py-4">
          <PatientAvatar name={patient.name.full} size="lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-xl font-semibold text-foreground">{patient.name.full}</h1>
              <span className="text-sm text-muted-foreground">{formatAgeSex(patient.dob, patient.sex)}</span>
              <span className="font-mono text-xs text-muted-foreground">{patient.mrn}</span>
              {patient.bloodType && <span className="text-xs text-muted-foreground">Blood {patient.bloodType}</span>}
            </div>
            <AllergyChips patientId={patient.id} />
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <div className="hidden text-right text-xs text-muted-foreground md:block">
                <p className="flex items-center justify-end gap-1"><CloudCheck className="h-3.5 w-3.5" /> Draft saved</p>
                <button type="button" onClick={discardDraft} className="hover:text-destructive hover:underline">Discard draft</button>
              </div>
            )}
            <Button size="lg" onClick={requestSign} disabled={signing} className="h-10 px-5 shadow-sm">
              {signing ? <Loader2 className="animate-spin" /> : <FileSignature />}
              {signing ? "Signing…" : "Sign visit"}
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <ClinicalNotes
            ref={ccRef}
            chiefComplaint={visit.chiefComplaint}
            onChiefComplaintChange={v => { setCcInvalid(false); update("chiefComplaint", v); }}
            soap={visit.soap}
            onSoapChange={v => update("soap", v)}
            invalid={ccInvalid}
          />
          <DiagnosisSearch diagnoses={visit.diagnoses} onChange={v => update("diagnoses", v)} />
          <PrescriptionForm
            prescriptions={visit.prescriptions}
            onChange={v => update("prescriptions", v)}
            suggestions={medicationSuggestions}
            patientId={patient.id}
          />
          <LabOrderForm
            tests={visit.labTests}
            onTestsChange={v => update("labTests", v)}
            priority={visit.labPriority}
            onPriorityChange={v => update("labPriority", v)}
            notes={visit.labNotes}
            onNotesChange={v => update("labNotes", v)}
            catalog={labTestsCatalog}
            labs={labs}
          />
        </div>
        <aside className="space-y-6">
          <VitalsPanel vitals={visit.vitals} onChange={v => update("vitals", v)} recorded={triage} />
          <PatientContext patientId={patient.id} />
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign this visit?</AlertDialogTitle>
            <AlertDialogDescription>
              The visit for {patient.name.full} will be finalised and the following sent out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <SummaryLine ok label="Chief complaint" value={visit.chiefComplaint} />
            <SummaryLine ok={visit.diagnoses.length > 0} label="Diagnoses"
              value={visit.diagnoses.length ? visit.diagnoses.map(d => d.name).join(", ") : "None recorded"} />
            <SummaryLine ok label="To pharmacy"
              value={visit.prescriptions.length ? visit.prescriptions.map(p => p.displayName).join(", ") : "No prescriptions"} />
            <SummaryLine ok label="To lab"
              value={visit.labTests.length ? `${visit.labTests.map(t => labs.length > 1 ? `${t.name} → ${labs.find(l => l.id === t.labId)?.name}` : t.name).join(", ")} (${visit.labPriority})` : "No lab tests"} />
            {appointmentId && <SummaryLine ok label="Appointment" value="Marked as completed" />}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={sign}><FileSignature /> Sign visit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryLine({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li className="flex gap-2.5">
      {ok
        ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-status-success-text" />
        : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-text" />}
      <span>
        <span className="font-medium text-foreground">{label}: </span>
        <span className="text-muted-foreground">{value}</span>
      </span>
    </li>
  );
}
