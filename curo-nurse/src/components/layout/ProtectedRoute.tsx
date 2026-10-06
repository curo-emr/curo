"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

// The nurse station is for nursing officers (super admins may look in for support).
const ALLOWED_ROLES = ["NURSE", "SUPER_ADMIN"];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-background h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-background h-screen">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-background h-screen">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <p className="text-lg font-semibold text-foreground">This portal is for nursing officers</p>
          <p className="text-sm text-muted-foreground">
            You are signed in as <span className="font-medium">{user.email}</span> ({user.role}). Sign in with a
            nursing officer account to continue.
          </p>
          <Button variant="outline" onClick={logout}>Sign out</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
