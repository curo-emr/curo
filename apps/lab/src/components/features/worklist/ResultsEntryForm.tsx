"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { CheckCircle, FlaskConical, Loader2, MessageSquareText } from "lucide-react";
import { resultFlag } from "@curo/web/clinical";
import { Button } from "@curo/web/ui/button";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { SectionCard } from "@curo/web/ui/section-card";
import { Textarea } from "@curo/web/ui/textarea";
import { ResultFlagBadge } from "@/components/features/orders/ResultFlagBadge";
import { enterResults, type ResultEntry } from "@/lib/api/lab";
import { ROUTES } from "@/lib/constants";
import { invalidateOrder, orderQueries } from "@/lib/queries";
import { interpret } from "@/lib/result-flag";
import type { LabOrder } from "@/types";
import { LabReportUpload } from "./LabReportUpload";

/**
 * One row per ordered test, and the report files uploaded for the order.
 * Submitting files the results and completes the order. The results are a
 * value for every test, or an uploaded report with no values typed (the
 * report holds them), or both.
 */
export function ResultsEntryForm({ order }: { order: LabOrder }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<ResultEntry[]>(() =>
    order.tests.map(test => ({
      code: test.testId,
      display: test.name,
      value: "",
      unit: "",
      referenceRangeLow: "",
      referenceRangeHigh: "",
    })),
  );
  const [conclusion, setConclusion] = useState("");
  // Uploading a report refreshes this list, so the form knows it can be submitted without typed values.
  const reportCount = useQuery(orderQueries.reports(order.id)).data?.length ?? 0;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (index: number, field: keyof ResultEntry, value: string) => {
    setEntries(prev => prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  };

  const typedCount = entries.filter(entry => entry.value.trim()).length;
  const allTyped = entries.length > 0 && typedCount === entries.length;
  const canSubmit = allTyped || (typedCount === 0 && reportCount > 0);
  const hint = typedCount > 0
    ? "Enter a result for every test, or clear them and submit the uploaded report."
    : "Enter a result for every test, or upload the report, to submit.";

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await enterResults({ orderId: order.id, results: allTyped ? entries : [], conclusion });
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
        description="Numbers are flagged against the reference range as you type."
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
            return (
              <div key={`${entry.code}:${i}`} className="grid grid-cols-2 items-center gap-3 px-5 py-3 md:grid-cols-12">
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
            );
          })}
        </div>
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
