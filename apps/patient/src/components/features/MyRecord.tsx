"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { myQueries } from "@/lib/queries";
import type { Patient } from "@/types";

/** Renders `children` with the signed-in patient's record, once it has loaded. */
export function MyRecord({ children }: { children: (patient: Patient) => ReactNode }) {
  const profile = useQuery(myQueries.profile());
  return (
    <QueryContent query={profile} what="your record">
      {patient => patient ? children(patient) : <div className="text-center py-12 text-muted-foreground">Patient data not found.</div>}
    </QueryContent>
  );
}
