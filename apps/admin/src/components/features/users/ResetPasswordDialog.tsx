"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { apiErrorMessage } from "@curo/web/api";
import { Button } from "@curo/web/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@curo/web/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@curo/web/ui/field";
import { resetUserPassword } from "@/lib/api/users";
import type { AdminUser } from "@/types";
import { PasswordInput } from "./PasswordInput";

const MIN_LENGTH = 8;

interface ResetPasswordDialogProps {
  user: Pick<AdminUser, "id" | "name">;
  /** The button that opens it: filled on the user's page, quieter in a list row. */
  trigger: React.ReactNode;
}

/**
 * Sets a new password for someone who forgot theirs, then shows it once so the admin
 * can pass it on: nothing is emailed. A sign-in lockout is lifted with it.
 */
export function ResetPasswordDialog({ user, trigger }: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const reset = useMutation({ mutationFn: () => resetUserPassword(user.id, password) });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPassword("");
      reset.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {reset.isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Password reset for {user.name}</DialogTitle>
              <DialogDescription>
                Give them this password. They can sign in with it now, and it won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            <ShownOnce password={password} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); reset.mutate(); }} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Reset {user.name}&apos;s password</DialogTitle>
              <DialogDescription>Their old password stops working straight away.</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <PasswordInput id="new-password" value={password} onChange={e => setPassword(e.target.value)} onGenerate={setPassword} autoFocus />
              <FieldDescription>At least {MIN_LENGTH} characters. Generate makes one that&apos;s easy to read out.</FieldDescription>
              {reset.isError && <FieldError>{apiErrorMessage(reset.error, "The password couldn't be reset.")}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={reset.isPending}>Cancel</Button>
              <Button type="submit" disabled={password.length < MIN_LENGTH || reset.isPending}>
                {reset.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
                Reset password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShownOnce({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
      <code className="truncate font-mono text-lg tracking-wide text-foreground">{password}</code>
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
