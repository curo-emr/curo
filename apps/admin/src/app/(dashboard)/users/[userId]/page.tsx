"use client";

import { useState, use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { Button } from "@curo/web/ui/button";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@curo/web/ui/dialog";
import { updateUser, resetUserPassword } from "@/lib/api/users";
import { correctPayment, getPaymentsPage } from "@/lib/api/payments";
import { paymentQueries, userQueries } from "@/lib/queries";
import { QueryContent } from "@curo/web/query";
import { ROUTES, ROLE_LABELS, WORKPLACE_TYPES, type UserRole } from "@/lib/constants";
import { WorkplaceSelect } from "@/components/features/organizations/WorkplaceSelect";
import { format, parseISO } from "date-fns";
import type { AdminUser, Payment } from "@/types";
import { apiErrorMessage } from "@curo/web/api";
import { useServerPagination } from "@curo/web/hooks";
import { Pagination } from "@curo/web/ui/pagination";

function money(amount: number, currency = "LKR") {
  const f = Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "LKR" ? `Rs. ${f}` : `${currency} ${f}`;
}

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const user = useQuery(userQueries.detail(userId));

  return (
    <QueryContent query={user} what="this user">
      {u => (u ? <UserDetail user={u} /> : <p className="text-muted-foreground">User not found.</p>)}
    </QueryContent>
  );
}

function UserDetail({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient();
  const setUser = (updated: AdminUser) => queryClient.setQueryData(userQueries.detail(user.id).queryKey, updated);

  const toggleActive = async () => {
    try {
      const updated = await updateUser(user.id, { isActive: !user.isActive });
      setUser(updated);
      toast.success(updated.isActive ? "Account activated" : "Account suspended");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update"));
    }
  };

  const changeWorkplace = async (organizationId: string) => {
    try {
      setUser(await updateUser(user.id, { organizationId }));
      toast.success("Workplace changed", { description: "Takes effect at their next sign-in, or within 15 minutes." });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to change workplace"));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href={ROUTES.USERS} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to users
      </Link>

      <Card className="shadow-sm border">
        <CardContent className="p-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
              <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
              {user.isActive
                ? <Badge variant="outline" className="bg-status-success-bg text-status-success-text border-status-success-border">Active</Badge>
                : <Badge variant="outline" className="bg-status-neutral-bg text-status-neutral-text border-status-neutral-border">Suspended</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            {user.specialization && <p className="text-sm text-muted-foreground">{user.specialization}</p>}
            {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
            <p className="text-xs text-muted-foreground mt-2">Joined {user.createdAt ? format(parseISO(user.createdAt), "dd MMM yyyy") : "—"}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={toggleActive} className="gap-2">
              {user.isActive ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {user.isActive ? "Suspend" : "Activate"}
            </Button>
            <ResetPasswordDialog userId={user.id} />
          </div>
        </CardContent>
      </Card>

      {WORKPLACE_TYPES[user.role as UserRole] && (
        <Card className="shadow-sm border">
          <CardHeader className="bg-muted/50 border-b pb-3"><CardTitle className="text-base">Workplace</CardTitle></CardHeader>
          <CardContent className="p-5 max-w-sm">
            <WorkplaceSelect role={user.role as UserRole} value={user.organizationId} onChange={changeWorkplace} />
          </CardContent>
        </Card>
      )}

      {user.role === "RECEPTIONIST" && user.practitionerId && <CollectedIncome practitionerId={user.practitionerId} />}
    </div>
  );
}

/** A receptionist's collected payments, latest first, a page at a time, under their total. */
function CollectedIncome({ practitionerId }: { practitionerId: string }) {
  // Payments corrected here, shown in place of what the page was loaded with.
  const [corrected, setCorrected] = useState<Record<string, Payment>>({});
  const { items, total: paymentCount, isLoading, page, setPage, pageSize, setPageSize } = useServerPagination(
    (page, pageSize) => getPaymentsPage({ page, pageSize, collectedBy: practitionerId }),
    [practitionerId],
  );
  const payments = items.map((p) => corrected[p.id] ?? p);

  // The total over every payment they took, read again after each correction.
  const queryClient = useQueryClient();
  const totalIncome = useQuery(paymentQueries.totals(practitionerId)).data?.total ?? null;
  const onCorrected = (payment: Payment) => {
    setCorrected((prev) => ({ ...prev, [payment.id]: payment }));
    void queryClient.invalidateQueries({ queryKey: paymentQueries.all });
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Collected income</CardTitle>
        <span className="text-sm font-semibold text-foreground">{totalIncome === null ? "—" : money(totalIncome)}</span>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments collected yet.</p>
        ) : (
          payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b last:border-0 pb-2">
              <div>
                <p className="text-sm font-medium font-mono">{p.receiptNumber}</p>
                <p className="text-xs text-muted-foreground">{p.paidAt ? format(parseISO(p.paidAt), "dd MMM yyyy, HH:mm") : "—"} · {p.paymentMethod}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Left out of the total above, which counts paid payments only. */}
                {p.status && p.status !== "paid" && <StatusBadge status={p.status} />}
                <span className="font-medium">{money(Number(p.amount), p.currency)}</span>
                <EditPaymentDialog payment={p} onSaved={onCorrected} />
              </div>
            </div>
          ))
        )}
        {paymentCount > 0 && (
          <Pagination page={page} pageSize={pageSize} total={paymentCount} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </CardContent>
    </Card>
  );
}

function ResetPasswordDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      await resetUserPassword(userId, pw);
      toast.success("Password reset");
      setOpen(false);
      setPw("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to reset password"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><KeyRound className="h-4 w-4" /> Reset password</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Reset password</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="newpw">New temporary password</Label>
          <Input id="newpw" type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPaymentDialog({ payment, onSaved }: { payment: Payment; onSaved: (p: Payment) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(payment.amount));
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v = parseFloat(amount);
    if (!v || v <= 0) { toast.error("Enter a valid amount"); return; }
    setBusy(true);
    try {
      const updated = await correctPayment(payment.id, { amount: v, notes });
      toast.success("Payment corrected");
      onSaved(updated);
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to correct payment"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Correct payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amt">Amount (Rs.)</Label>
            <Input id="amt" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Reason / notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this being corrected?" />
          </div>
          <p className="text-xs text-muted-foreground">This correction is recorded in the audit log.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
