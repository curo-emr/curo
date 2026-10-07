"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@curo/web/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  // This portal is for super admins only.
  if (!isLoading && user && !isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-background h-screen">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <p className="text-lg font-semibold text-foreground">Access denied</p>
          <p className="text-sm text-muted-foreground">
            This portal is restricted to super administrators. Your account role is
            <span className="font-medium"> {user.role}</span>.
          </p>
        </div>
      </div>
    );
  }

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

  return <>{children}</>;
}
