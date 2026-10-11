"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Loader2, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { apiErrorMessage } from "@curo/web/api";
import { formatMoney, formatStatus } from "@curo/web/format";
import { useServerPagination } from "@curo/web/hooks";
import { Button } from "@curo/web/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@curo/web/ui/dialog";
import { EmptyState } from "@curo/web/ui/empty-state";
import { Field, FieldGroup, FieldLabel } from "@curo/web/ui/field";
import { Input } from "@curo/web/ui/input";
import { LoadError } from "@curo/web/ui/load-error";
import { Pagination } from "@curo/web/ui/pagination";
import { SectionCard } from "@curo/web/ui/section-card";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { correctPayment, getPaymentsPage } from "@/lib/api/payments";
import { paymentQueries } from "@/lib/queries";
import type { Payment } from "@/types";

/** A receptionist's collected payments, latest first, a page at a time, under their total. */
export function CollectedIncome({ practitionerId }: { practitionerId: string }) {
  // Payments corrected here, shown in place of what the page was loaded with.
  const [corrected, setCorrected] = useState<Record<string, Payment>>({});
  const { items, total: paymentCount, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    (page, pageSize) => getPaymentsPage({ page, pageSize, collectedBy: practitionerId }),
    [practitionerId],
  );
  const payments = items.map(p => corrected[p.id] ?? p);

  // The total over every payment they took, read again after each correction.
  const queryClient = useQueryClient();
  const totals = useQuery(paymentQueries.totals(practitionerId));
  const onCorrected = (payment: Payment) => {
    setCorrected(prev => ({ ...prev, [payment.id]: payment }));
    void queryClient.invalidateQueries({ queryKey: paymentQueries.all });
  };

  return (
    <SectionCard
      icon={Wallet}
      iconClassName="text-primary"
      title="Collected income"
      description="Payments they took at the front desk. Correct a wrong amount here."
      headerRight={totals.data && <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{formatMoney(totals.data.total, totals.data.currency)}</span>}
      noPadding
    >
      {isLoading ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading payments…
        </div>
      ) : isError ? (
        <LoadError what="payments" />
      ) : payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments collected yet" />
      ) : (
        <ul className="divide-y">
          {payments.map(p => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium text-foreground">{p.receiptNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {[p.paidAt && format(parseISO(p.paidAt), "d MMM yyyy, HH:mm"), p.paymentMethod && formatStatus(p.paymentMethod)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Left out of the total above, which counts paid payments only. */}
                {p.status && p.status !== "paid" && <StatusBadge status={p.status} />}
                <span className="font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                <CorrectPaymentDialog payment={p} onSaved={onCorrected} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {paymentCount > 0 && (
        <div className="border-t px-5 py-3">
          <Pagination page={page} pageSize={pageSize} total={paymentCount} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}
    </SectionCard>
  );
}

function CorrectPaymentDialog({ payment, onSaved }: { payment: Payment; onSaved: (p: Payment) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(payment.amount));
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [busy, setBusy] = useState(false);
  const value = Number(amount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      onSaved(await correctPayment(payment.id, { amount: value, notes }));
      toast.success("Payment corrected", { description: payment.receiptNumber });
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "The payment couldn't be corrected"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs">Correct</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Correct payment</DialogTitle>
            <DialogDescription>Receipt {payment.receiptNumber}. The change is recorded in the audit log.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="amount">Amount (Rs.)</FieldLabel>
              <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Reason</FieldLabel>
              <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why is this being corrected?" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={!(value > 0) || busy}>
              {busy && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
