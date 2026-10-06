"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-50 p-4 rounded-full mb-6">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-slate-500 mb-6 max-w-md">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700">
        Try Again
      </Button>
    </div>
  );
}
