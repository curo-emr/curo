"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { CheckCircle, ClipboardPaste, FlaskConical, Loader2, MessageSquareText } from "lucide-react";
import { adultRangesApply, analytesToReport, referenceRangeFor, resultFlag } from "@curo/web/clinical";
import { Button } from "@curo/web/ui/button";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { SectionCard } from "@curo/web/ui/section-card";
import { Textarea } from "@curo/web/ui/textarea";
import { ResultFlagBadge } from "@curo/web/ui/result-flag-badge";
import { enterResults, RESULTS_TEXT_MAX_LENGTH, type ResultEntry } from "@/lib/api/lab";
import { ROUTES } from "@/lib/constants";
import { invalidateOrder, orderQueries } from "@/lib/queries";
import { interpret } from "@/lib/result-flag";
import type { LabOrder, LabTestCatalogItem, Patient } from "@/types";
import { LabReportUpload } from "./LabReportUpload";

/** A value to enter, under the test it reports for. */
type ResultRow = ResultEntry & { testCode: string; testName: string };

/**
 * A row for every value the ordered tests report (a full blood count has three), with
 * the unit and the patient's reference range from the lab's catalog filled in.
 */
function blankRows(order: LabOrder, catalog: LabTestCatalogItem[], patient: Patient): ResultRow[] {
  const tests = order.tests.map(t => ({ code: t.testId, name: t.name }));
  return analytesToReport(tests, catalog).map(({ test, analyte }) => {
    const range = referenceRangeFor(analyte, patient);
    return {
      testCode: test.code,
      testName: test.name,
      code: analyte.code,
      display: analyte.display,
      value: "",
      unit: analyte.unit,
      referenceRangeLow: range ? String(range.low) : "",
      referenceRangeHigh: range ? String(range.high) : "",
    };
  });
}

interface ResultsEntryFormProps {
  order: LabOrder;
  patient: Patient;
  /** Your lab's tests, for what each one reports. */
  catalog: LabTestCatalogItem[];
}

/**
 * A row per value the order reports, a box for results pasted as text, and the report
 * files uploaded for the order. Submitting files the results and completes the order.
 * Values are typed in full or not at all; with none typed, the pasted text or an
 * uploaded report holds the results.
 */
export function ResultsEntryForm({ order, patient, catalog }: ResultsEntryFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState(() => blankRows(order, catalog, patient));
  const [resultsText, setResultsText] = useState("");
  const [conclusion, setConclusion] = useState("");
  // Uploading a report refreshes this list, so the form knows it can be submitted without typed values.
  const reportCount = useQuery(orderQueries.reports(order.id)).data?.length ?? 0;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const panelSize = (testCode: string) => entries.filter(entry => entry.testCode === testCode).length;

  const update = (index: number, field: keyof ResultEntry, value: string) => {
    setEntries(prev => prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  };

  const typedCount = entries.filter(entry => entry.value.trim()).length;
  const allTyped = entries.length > 0 && typedCount === entries.length;
  const hasText = resultsText.trim() !== "";
  const canSubmit = allTyped || (typedCount === 0 && (hasText || reportCount > 0));
  const hint = typedCount > 0
    ? "Enter every value, or clear them and submit the text or uploaded report."
    : "Enter every value, paste the results as text, or upload the report, to submit.";

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await enterResults({ orderId: order.id, results: allTyped ? entries : [], resultsText, conclusion });
      void invalidateOrder(queryClient, order);
      toast.success("Results submitted. The ordering doctor has been notified.");
      router.push(ROUTES.ORDER(order.id));
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error("Results for this order have already been entered.");
        router.push(ROUTES.ORDER(order.id));
        return;
      }
      console.error(err);
      toast.error("Could not submit the results. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        icon={FlaskConical}
        iconClassName="text-primary"
        title="Results"
        count={entries.length}
        description={adultRangesApply(patient.dob)
          ? "Units and ranges come from your catalog, by sex where they differ; change them if your analyser's differ. Numbers are flagged as you type."
          : "The catalog's ranges are for adults, so enter this patient's ranges yourself. Numbers are flagged as you type."}
        noPadding
      >
        <div className="hidden grid-cols-12 gap-3 px-5 pt-3 text-xs font-medium text-muted-foreground md:grid">
          <span className="col-span-3">Test</span>
          <span className="col-span-3">Result</span>
          <span className="col-span-2">Unit</span>
          <span className="col-span-3">Reference range</span>
          <span className="col-span-1">Flag</span>
        </div>
        <div className="divide-y">
          {entries.map((entry, i) => {
            const flag = resultFlag(interpret(entry.value, entry.referenceRangeLow, entry.referenceRangeHigh));
            const startsPanel = (i === 0 || entries[i - 1].testCode !== entry.testCode) && panelSize(entry.testCode) > 1;
            return (
              <Fragment key={`${entry.testCode}:${entry.code}:${i}`}>
                {startsPanel && (
                  <p className="bg-muted/40 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{entry.testName}</p>
                )}
                <div className="grid grid-cols-2 items-center gap-3 px-5 py-3 md:grid-cols-12">
                  <div className="col-span-2 md:col-span-3">
                    <Label htmlFor={`value-${i}`} className="text-sm font-medium text-foreground">{entry.display}</Label>
                    <p className="font-mono text-xs text-muted-foreground">{entry.code}</p>
                  </div>
                  <Input
                    id={`value-${i}`}
                    placeholder="Value"
                    value={entry.value}
                    onChange={e => update(i, "value", e.target.value)}
                    className="md:col-span-3"
                  />
                  <Input
                    aria-label={`${entry.display} unit`}
                    placeholder="Unit"
                    value={entry.unit}
                    onChange={e => update(i, "unit", e.target.value)}
                    className="md:col-span-2"
                  />
                  <div className="flex items-center gap-2 md:col-span-3">
                    <Input
                      aria-label={`${entry.display} reference range low`}
                      placeholder="Low"
                      inputMode="decimal"
                      value={entry.referenceRangeLow}
                      onChange={e => update(i, "referenceRangeLow", e.target.value)}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      aria-label={`${entry.display} reference range high`}
                      placeholder="High"
                      inputMode="decimal"
                      value={entry.referenceRangeHigh}
                      onChange={e => update(i, "referenceRangeHigh", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-1">{flag && <ResultFlagBadge flag={flag} />}</div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        icon={ClipboardPaste}
        iconClassName="text-primary"
        title="Results as text"
        description="Paste the analyser's or lab system's printout, in place of the values above or alongside them. Kept as pasted; typed values are flagged, text isn't."
      >
        <Textarea
          aria-label="Results as text"
          placeholder="Paste the results here"
          value={resultsText}
          onChange={e => setResultsText(e.target.value)}
          maxLength={RESULTS_TEXT_MAX_LENGTH}
          // Unwrapped, so a printout's columns stay lined up; it scrolls sideways instead.
          wrap="off"
          spellCheck={false}
          className="max-h-[32rem] min-h-40 font-mono text-xs md:text-xs"
        />
      </SectionCard>

      <SectionCard icon={MessageSquareText} iconClassName="text-primary" title="Conclusion" description="Optional. For the ordering doctor; printed on the report.">
        <Textarea
          aria-label="Conclusion"
          placeholder="Interpretation or comments"
          value={conclusion}
          onChange={e => setConclusion(e.target.value)}
          rows={3}
        />
      </SectionCard>

      <LabReportUpload orderId={order.id} patientId={order.patientId} encounterId={order.encounterId} />

      <div className="flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        {!canSubmit && <p className="text-xs text-muted-foreground">{hint}</p>}
        <Button size="lg" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
          Submit results
        </Button>
      </div>
    </div>
  );
}
