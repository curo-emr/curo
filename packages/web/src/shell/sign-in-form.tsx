"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";
import { toneClass } from "../ui/tones";
import { signInErrorMessage } from "../api/errors";

interface SignInFormProps {
  /** Under "Welcome back", e.g. "Sign in to the doctor portal". */
  subtitle: string;
  emailPlaceholder?: string;
  forgotPasswordHref?: string;
  /** Signs in and moves on; a rejection shows why (wrong credentials, a lockout, no connection). */
  onSignIn: (email: string, password: string) => Promise<void>;
}

// Email + password sign-in, shared by every portal's login page.
export function SignInForm({ subtitle, emailPlaceholder = "you@curo.test", forgotPasswordHref = "/forgot-password", onSignIn }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setPending(true);
    setError(null);
    try {
      await onSignIn(email, password);
    } catch (err) {
      setError(signInErrorMessage(err));
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <form onSubmit={submit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <InputGroup className="h-11">
              <InputGroupInput
                id="email"
                type="email"
                autoComplete="email"
                placeholder={emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <InputGroupAddon><Mail /></InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link href={forgotPasswordHref} className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <InputGroup className="h-11">
              <InputGroupInput
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <InputGroupAddon><Lock /></InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          {error && (
            <p role="alert" className={cn("rounded-lg border px-3 py-2 text-sm", toneClass("error"))}>
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="group h-11 w-full" disabled={pending || !email || !password}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Signing in…" : "Sign in"}
            {!pending && <ArrowRight className="transition-transform group-hover:translate-x-0.5" />}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
