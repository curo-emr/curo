"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleCheck, CircleX, ClipboardList, Info, Loader2, PackageCheck, Pill, TriangleAlert, type LucideIcon } from "lucide-react";
import { apiErrorMessage } from "@curo/web/api";
import { formatStatus } from "@curo/web/format";
import { QueryContent, allOf, dataOrNull } from "@curo/web/query";
import { Button } from "@curo/web/ui/button";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { Skeleton } from "@curo/web/ui/skeleton";
import { StatusBadge, toneClass, type Tone } from "@curo/web/ui/status-badge";
import { PatientSummaryCard } from "@/components/features/patients/PatientSummaryCard";
import { DispenseRecordCard } from "@/components/features/dispensing/DispenseRecordCard";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { dispense } from "@/lib/api/pharmacy";
import { medicineName } from "@/lib/prescriptions";
import { invalidateAfterDispense, patientQueries, prescriptionQueries, stockQueries } from "@/lib/queries";
import { checkStock, type StockCheck } from "@/lib/stock";
import type { Prescription, PrescriptionItem } from "@/types";

// Only active prescriptions (mapped to "sent_to_pharmacy") can be dispensed.
const DISPENSABLE_STATUS = "sent_to_pharmacy";

function medicationDetails(item: PrescriptionItem): [string, string][] {
  const details: [string, string][] = [
    ["Directions", item.instructions],
    ["Frequency", item.frequency],
    ["Route", item.route],
    ["Quantity", `${item.quantity} ${item.quantityUnit}`.trim()],
    ["Duration", item.durationDays ? `${item.durationDays} days` : ""],
  ];
  return details.filter(([, value]) => value);
}

export default function PrescriptionDetailPage({ params }: { params: Promise<{ prescriptionId: string }> }) {
  const { prescriptionId } = use(params);
  const prescription = useQuery(prescriptionQueries.detail(prescriptionId));

  return (
    <QueryContent query={prescription} what="this prescription">
      {rx => {
        if (!rx) notFound();
        return <PrescriptionDetail prescription={rx} />;
      }}
    </QueryContent>
  );
}

function PrescriptionDetail({ prescription }: { prescription: Prescription }) {
  const queryClient = useQueryClient();
  const { patientId } = prescription;
  const patient = useQuery(patientQueries.detail(patientId));
  const allergiesQuery = useQuery(patientQueries.allergies(patientId));
  const allergies = dataOrNull(allergiesQuery);
  const records = useQuery(prescriptionQueries.dispensing(prescription.id));
  const stock = useQuery(stockQueries.grouped());
  const alsoWaiting = (useQuery(prescriptionQueries.pending()).data ?? [])
    .filter(rx => rx.patientId === patientId && rx.id !== prescription.id);

  const dispenseRx = useMutation({
    mutationFn: () => dispense(prescription.id),
    onSuccess: record => {
      toast.success(`Dispensed ${medicineName(prescription)}`, {
        description: `Receipt ${record.receiptNumber} · ${formatCurrency(record.totalAmount)}`,
      });
      return invalidateAfterDispense(queryClient, patientId);
    },
  });

  // Never dispense without the patient and their allergies on screen.
  const checks = allOf(patient, allergiesQuery);
  const checked = !!patient.data && !!allergies;
  // The server checks stock again as it dispenses; this only saves a trip that would fail.
  const stockChecks = stock.data && prescription.items.map(item => checkStock(item, stock.data));
  const stockShort = stockChecks?.some(c => c.kind !== "enough") ?? false;
  const dispensable = prescription.status === DISPENSABLE_STATUS;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        back={{ href: ROUTES.PRESCRIPTIONS, label: "All prescriptions" }}
        title={medicineName(prescription)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={prescription.status} />
            Prescribed {formatDate(prescription.createdAt)}
            <span className="font-mono text-xs">{prescription.id.slice(0, 8).toUpperCase()}</span>
          </span>
        }
      />

      <QueryContent query={patient} what="the patient">
        {p => p
          ? <PatientSummaryCard patient={p} allergies={allergies} href={ROUTES.PATIENT(p.id)} />
          : <p className="text-sm text-muted-foreground">This prescription&apos;s patient wasn&apos;t found.</p>}
      </QueryContent>

      <SectionCard icon={Pill} iconClassName="text-primary" title="To dispense" noPadding>
        <div className="space-y-5 p-5">
          {prescription.items.map((item, i) => (
            <div key={item.id} className="space-y-3">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                {medicationDetails(item).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              {dispensable && (stock.isError
                ? <Notice tone="neutral" icon={Info}>Stock couldn&apos;t be checked here; dispensing checks it again.</Notice>
                : stockChecks ? <StockLine check={stockChecks[i]} item={item} /> : <Skeleton className="h-9 w-64" />)}
            </div>
          ))}
          {prescription.notesToPharmacy && (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="font-medium">Doctor&apos;s note: </span>{prescription.notesToPharmacy}
            </p>
          )}
        </div>

        <div className="space-y-3 border-t bg-muted/30 px-5 py-4">
          {dispensable ? (
            <>
              <Button size="lg" onClick={() => dispenseRx.mutate()} disabled={!checked || stockShort || dispenseRx.isPending}>
                {dispenseRx.isPending ? <Loader2 className="animate-spin" /> : <PackageCheck />}
                {dispenseRx.isPending ? "Dispensing…" : "Dispense"}
              </Button>
              {!checked && checks.isError && (
                <p className="text-sm text-status-error-text">
                  The patient&apos;s record or allergies couldn&apos;t be loaded, so this can&apos;t be dispensed until they are.{" "}
                  <button type="button" className="font-medium underline" onClick={() => void checks.refetch()}>
                    Try again
                  </button>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This prescription is {formatStatus(prescription.status).toLowerCase()} and can&apos;t be dispensed.
            </p>
          )}
          {dispenseRx.isError && (
            <Notice tone="error" icon={CircleX}>{apiErrorMessage(dispenseRx.error, "The prescription couldn't be dispensed.")}</Notice>
          )}
        </div>
      </SectionCard>

      {alsoWaiting.length > 0 && (
        <SectionCard
          icon={ClipboardList}
          title={`Also waiting for ${patient.data?.name.first ?? "this patient"}`}
          count={alsoWaiting.length}
          noPadding
        >
          <ul className="divide-y">
            {alsoWaiting.map(rx => (
              <li key={rx.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0 truncate text-sm font-medium text-foreground">{medicineName(rx)}</span>
                <Button asChild size="sm" variant="outline">
                  <Link href={ROUTES.PRESCRIPTION(rx.id)}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <QueryContent query={records} what="the dispensing history" loading={null}>
        {list => list.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Dispensed</h2>
            {list.map(record => <DispenseRecordCard key={record.id} record={record} />)}
          </section>
        )}
      </QueryContent>
    </div>
  );
}

/** Whether this pharmacy can cover the item, before anyone presses Dispense. */
function StockLine({ check, item }: { check: StockCheck; item: PrescriptionItem }) {
  switch (check.kind) {
    case "enough":
      return <Notice tone="success" icon={CircleCheck}>In stock: {check.available} {check.unit}</Notice>;
    case "short":
      return (
        <Notice tone="error" icon={CircleX}>
          Not enough in stock: {check.available} {check.unit} here, {item.quantity} prescribed.
        </Notice>
      );
    case "unlisted":
      return (
        <Notice tone="warning" icon={TriangleAlert}>
          This pharmacy keeps no stock under this medicine&apos;s code ({item.medicationId || "none"}), so it can&apos;t be dispensed here.
        </Notice>
      );
  }
}

function Notice({ tone, icon: Icon, children }: { tone: Tone; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", toneClass(tone))}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
