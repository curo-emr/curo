"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Input } from "@curo/web/ui/input";
import { Button } from "@curo/web/ui/button";
import { Badge } from "@curo/web/ui/badge";
import { Label } from "@curo/web/ui/label";
import { Textarea } from "@curo/web/ui/textarea";
import { LabOrder, Patient } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { enterResults, type ResultEntry } from "@/lib/api/lab";
import { interpret, type Interpretation } from "@/lib/result-flag";
import { ROUTES } from "@/lib/constants";
import { LabReportUpload } from "./LabReportUpload";
import { FlaskConical, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ResultsEntryFormProps {
  order: LabOrder;
  patient: Patient;
}

const FLAG_BADGE: Record<Interpretation, { label: string; className: string }> = {
  L: { label: "LOW", className: "text-primary border-primary/20 bg-primary/10" },
  H: { label: "HIGH", className: "text-status-warning-text border-status-warning-border bg-status-warning-bg" },
  N: { label: "Normal", className: "text-status-success-text border-status-success-border bg-status-success-bg" },
};

/**
 * One row per ordered test, and the report files uploaded for the order.
 * Submitting files the results and completes the order. The results are a
 * value for every test, or an uploaded report with no values typed (the
 * report holds them), or both.
 */
export function ResultsEntryForm({ order, patient }: ResultsEntryFormProps) {
  const router = useRouter();
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
  const [reportCount, setReportCount] = useState(0);
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
      {/* Order Summary */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Order ID</p>
              <p className="font-mono font-medium text-foreground">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Patient</p>
              <p className="font-medium text-foreground">{patient.name.full}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <StatusBadge status={order.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results Entry */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-primary" />
            Results ({entries.length} test{entries.length !== 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 pt-3 text-xs text-muted-foreground">
            <span className="col-span-3">Test</span>
            <span className="col-span-3">Result</span>
            <span className="col-span-2">Unit</span>
            <span className="col-span-3">Reference range</span>
            <span className="col-span-1">Flag</span>
          </div>
          <div className="divide-y">
            {entries.map((entry, i) => {
              const flag = interpret(entry.value, entry.referenceRangeLow, entry.referenceRangeHigh);
              return (
                <div key={`${entry.code}:${i}`} className="px-4 py-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3">
                      <Label htmlFor={`value-${i}`} className="text-sm font-medium text-foreground">{entry.display}</Label>
                      <p className="text-xs text-muted-foreground">{entry.code}</p>
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        id={`value-${i}`}
                        placeholder="Value"
                        value={entry.value}
                        onChange={e => update(i, "value", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        aria-label={`${entry.display} unit`}
                        placeholder="Unit"
                        value={entry.unit}
                        onChange={e => update(i, "unit", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center gap-2">
                      <Input
                        aria-label={`${entry.display} reference range low`}
                        placeholder="Low"
                        inputMode="decimal"
                        value={entry.referenceRangeLow}
                        onChange={e => update(i, "referenceRangeLow", e.target.value)}
                        className="h-9 text-sm"
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        aria-label={`${entry.display} reference range high`}
                        placeholder="High"
                        inputMode="decimal"
                        value={entry.referenceRangeHigh}
                        onChange={e => update(i, "referenceRangeHigh", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="md:col-span-1">
                      {flag && (
                        <Badge variant="outline" className={FLAG_BADGE[flag].className}>
                          {FLAG_BADGE[flag].label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conclusion */}
      <Card className="shadow-sm border">
        <CardContent className="p-4 space-y-2">
          <Label htmlFor="conclusion" className="text-sm font-medium text-foreground">Conclusion (optional)</Label>
          <Textarea
            id="conclusion"
            placeholder="Interpretation or comments for the ordering doctor; printed on the report"
            value={conclusion}
            onChange={e => setConclusion(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      <LabReportUpload orderId={order.id} patientId={order.patientId} encounterId={order.encounterId}
        onReportsChange={setReportCount} />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {!canSubmit && <p className="text-xs text-muted-foreground">{hint}</p>}
        <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Submit results
        </Button>
      </div>
    </div>
  );
}
