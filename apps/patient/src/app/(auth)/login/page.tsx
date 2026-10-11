"use client";

import { useRouter } from "next/navigation";
import { SignInForm } from "@curo/web/shell";
import { useAuth } from "@curo/web/auth";
import { ROUTES } from "@/lib/constants";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <SignInForm
      subtitle="Sign in to see your health record"
      emailPlaceholder="you@example.com"
      onSignIn={async (email, password) => {
        await login(email, password);
        router.push(ROUTES.HOME);
      }}
    />
  );
}
