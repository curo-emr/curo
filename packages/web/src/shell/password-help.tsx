import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "../ui/button";

// What to do about a forgotten password. There is no self-service reset: an
// administrator sets a new password from the admin portal.
export function PasswordHelp({ signInHref = "/login" }: { signInHref?: string }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Forgot your password?</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your clinic administrator can set a new one for you. Ask them to reset your password, then sign in with
            the password they give you.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="lg" className="h-11 w-full">
        <Link href={signInHref}>
          <ArrowLeft /> Back to sign in
        </Link>
      </Button>
    </div>
  );
}
