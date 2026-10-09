"use client";

import { useState } from "react";
import { Loader2, Lock, Plus } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { Badge } from "@curo/web/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@curo/web/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@curo/web/ui/select";
import { toast } from "sonner";
import { createPayment, type Payment } from "@/lib/api/payments";
import { apiErrorMessage } from "@curo/web/api";

function formatMoney(amount: number, currency = "LKR") {
  const formatted = Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "LKR" ? `Rs. ${formatted}` : `${currency} ${formatted}`;
}

interface RecordPaymentCellProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
  existingPayment?: Payment;
  onRecorded: (payment: Payment) => void;
}

export function RecordPaymentCell({
  appointmentId, patientId, patientName, existingPayment, onRecorded,
}: RecordPaymentCellProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);

  // Once a payment exists it is final — show the locked amount, no edit.
  if (existingPayment) {
    return (
      <Badge variant="outline" className="gap-1 text-status-success-text border-status-success-border">
        <Lock className="h-3 w-3" />
        {formatMoney(Number(existingPayment.amount), existingPayment.currency)}
      </Badge>
    );
  }

  const handleSubmit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const payment = await createPayment({
        patientId,
        appointmentId,
        amount: value,
        paymentMethod: method,
      });
      toast.success("Payment recorded", { description: `Receipt ${payment.receiptNumber}` });
      onRecorded(payment);
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to record payment"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" className="gap-1">
          <Plus className="h-3 w-3" /> Record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record visit payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Patient: <span className="font-medium text-foreground">{patientName}</span>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (Rs.)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2500"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Once submitted, the amount is final and cannot be edited.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
