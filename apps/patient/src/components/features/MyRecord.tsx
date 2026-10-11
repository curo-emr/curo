"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserRoundX } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { EmptyState } from "@curo/web/ui/empty-state";
import { RECEPTION } from "@/lib/constants";
import { myQueries } from "@/lib/queries";
import type { Patient } from "@/types";

/** Renders `children` with the signed-in patient's record, once it has loaded. */
export function MyRecord({ children }: { children: (patient: Patient) => ReactNode }) {
  const profile = useQuery(myQueries.profile());
  return (
    <QueryContent query={profile} what="your record">
      {patient => patient ? children(patient) : (
        <EmptyState
          icon={UserRoundX}
          title="We couldn't find your record"
          description={`Your sign-in isn't linked to a patient record yet. Ask ${RECEPTION} to link it.`}
        />
      )}
    </QueryContent>
  );
}
