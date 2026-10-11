"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Loader2, Sparkles } from "lucide-react";
import { apiErrorMessage } from "../api";
import { generatePassword } from "../auth/password";
import { Button } from "./button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "./dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./input-group";

/** The shortest password the auth service takes. */
export const MIN_PASSWORD_LENGTH = 8;

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Gets a new random password to put in the field. */
  onGenerate: (password: string) => void;
};

/** A password typed in plain sight, since staff pass it on, or made up with Generate. */
export function PasswordInput({ onGenerate, ...input }: PasswordInputProps) {
  return (
    <InputGroup>
      <InputGroupInput type="text" autoComplete="off" spellCheck={false} className="font-mono placeholder:font-sans" placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} {...input} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton onClick={() => onGenerate(generatePassword())}>
          <Sparkles /> Generate
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

interface PasswordDialogProps {
  /** The button that opens it. */
  trigger: React.ReactNode;
  /** e.g. "Reset Chamali Silva's password". */
  title: string;
  /** What saving does, e.g. "Their old password stops working straight away." */
  description: React.ReactNode;
  /** The saving button, e.g. "Reset password". */
  submitLabel: string;
  /** Shown once it's saved, e.g. "Password reset for Chamali Silva". */
  doneTitle: string;
  /** The email they sign in with, shown beside the password when they need telling. */
  email?: string;
  save: (password: string) => Promise<unknown>;
  /** Runs when the dialog closes after a save, e.g. to refresh what it changed. */
  onDone?: () => void;
}

/**
 * Sets someone's password, then shows it once so it can be passed on: nothing
 * is emailed.
 */
export function PasswordDialog({ trigger, title, description, submitLabel, doneTitle, email, save, onDone }: PasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const saving = useMutation({ mutationFn: () => save(password) });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    if (saving.isSuccess) onDone?.();
    setPassword("");
    saving.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {saving.isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>{doneTitle}</DialogTitle>
              <DialogDescription>
                Give them this password. They can sign in with it now, and it won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            {email && (
              <p className="text-sm text-muted-foreground">
                They sign in with <span className="font-medium text-foreground">{email}</span>
              </p>
            )}
            <ShownOnce password={password} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); saving.mutate(); }} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <PasswordInput id="new-password" value={password} onChange={e => setPassword(e.target.value)} onGenerate={setPassword} autoFocus />
              <FieldDescription>At least {MIN_PASSWORD_LENGTH} characters. Generate makes one that&apos;s easy to read out.</FieldDescription>
              {saving.isError && <FieldError>{apiErrorMessage(saving.error, "The password couldn't be saved.")}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving.isPending}>Cancel</Button>
              <Button type="submit" disabled={password.length < MIN_PASSWORD_LENGTH || saving.isPending}>
                {saving.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
                {submitLabel}
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
