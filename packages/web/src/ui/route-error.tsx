"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

interface RouteErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/** A route's `error.tsx` screen: what went wrong and a way to try again. Every portal default-exports it. */
export function RouteError({ error, retry }: RouteErrorProps) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={error.message || "An unexpected error occurred. Please try again."}
      action={<Button onClick={retry}>Try again</Button>}
      className="min-h-[60vh]"
    />
  );
}
