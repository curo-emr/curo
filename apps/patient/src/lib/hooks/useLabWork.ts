import { useQuery } from "@tanstack/react-query";
import { allOf, type Loadable } from "@curo/web/query";
import type { DocumentRef } from "@/lib/api/documents";
import { myQueries } from "@/lib/queries";
import type { LabReport, LabTest } from "@/types";

/** A lab test with what the lab sent back for it. */
export interface LabWork {
  test: LabTest;
  report?: LabReport;
  files: DocumentRef[];
}

/** The patient's lab tests, newest first, each with its report and report files. */
export function useLabWork(patientId: string): Loadable<LabWork[]> {
  const parts = allOf(
    useQuery(myQueries.labTests(patientId)),
    useQuery(myQueries.labReports(patientId)),
    useQuery(myQueries.documents()),
  );
  return {
    ...parts,
    data: parts.data && parts.data[0].map(test => ({
      test,
      report: parts.data![1].find(r => r.orderId === test.id),
      files: parts.data![2].filter(d => d.orderId === test.id),
    })),
  };
}
