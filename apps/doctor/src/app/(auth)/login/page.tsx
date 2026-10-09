"use client";

import { useRouter } from "next/navigation";
import { SignInForm } from "@curo/web/shell";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/constants";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <SignInForm
      subtitle="Sign in to the doctor portal"
      emailPlaceholder="doctor@curo.test"
      onSignIn={async (email, password) => {
        await login(email, password);
        router.push(ROUTES.DASHBOARD);
      }}
    />
  );
}
