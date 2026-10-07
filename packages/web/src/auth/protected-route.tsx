"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useAuth } from "./auth-provider";

type ProtectedRouteProps = { children: ReactNode } & (
  /** Any signed-in user may use the portal; the API still checks each request. */
  | { roles?: undefined; audience?: undefined }
  /** Only these roles may; `audience` names them, as in "This portal is for nursing officers". */
  | { roles: readonly string[]; audience: string }
);

function CenteredScreen({ children }: { children: ReactNode }) {
  return <div className="flex h-screen flex-1 items-center justify-center bg-background p-6">{children}</div>;
}

const Spinner = () => (
  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
);

/** Renders its children only for a signed-in user (with one of `roles`, when given); sends anyone else to /login. */
export function ProtectedRoute({ children, roles, audience }: ProtectedRouteProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <CenteredScreen>
        <Spinner />
      </CenteredScreen>
    );
  }

  if (!user) {
    return (
      <CenteredScreen>
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Spinner />
          <p>Redirecting to login...</p>
        </div>
      </CenteredScreen>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <CenteredScreen>
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold text-foreground">This portal is for {audience}</p>
          <p className="text-sm text-muted-foreground">
            You are signed in as <span className="font-medium">{user.email}</span> ({user.role}). Sign in with another
            account to continue.
          </p>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </div>
      </CenteredScreen>
    );
  }

  return <>{children}</>;
}
