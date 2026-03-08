"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsLoading(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="space-y-8">
        {/* Success state */}
        <div className="flex flex-col items-center text-center space-y-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)" }}
          >
            <CheckCircle2 className="w-8 h-8 text-status-success-text" />
          </div>

          <div className="space-y-2">
            <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
              Check your inbox
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              We&apos;ve sent a password reset link to
            </p>
            <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mt-1">
              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-800 truncate max-w-[220px]">
                {email}
              </span>
            </div>
          </div>

          <p className="text-[12px] text-gray-400 max-w-[260px] leading-relaxed">
            Didn&apos;t receive the email? Check your spam folder or wait a
            minute before trying again.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full h-11 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity"
            style={{
              background:
                "linear-gradient(135deg, #060d1a 0%, #12244a 60%, #1a3268 100%)",
            }}
            onClick={() => {
              setIsSubmitted(false);
              setEmail("");
            }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Try a different email
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full h-11 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          >
            <Link href="/login" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to login
      </Link>

      {/* Heading */}
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
          Reset your password
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              id="email"
              placeholder="patient@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 border-gray-200 rounded-xl bg-gray-50/60 focus-visible:bg-white focus-visible:ring-0 focus-visible:border-primary transition-colors"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity"
            style={{
              background:
                "linear-gradient(135deg, #060d1a 0%, #12244a 60%, #1a3268 100%)",
            }}
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending link...
              </span>
            ) : (
              "Send reset link"
            )}
          </Button>
        </div>
      </form>

      {/* Footer */}
      <p className="text-center text-[11px] text-gray-400">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary transition-colors"
        >
          Sign in instead
        </Link>
      </p>
    </div>
  );
}
