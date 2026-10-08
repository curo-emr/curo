"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Patient } from "@/types";
import { patientQueries } from "@/lib/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { SummaryTab } from "./tabs/SummaryTab";
import { VisitsTab } from "./tabs/VisitsTab";
import { MedicationsTab } from "./tabs/MedicationsTab";
import { LabsTab } from "./tabs/LabsTab";
import { DocumentsTab } from "../documents/DocumentsTab";
import { VitalsTrendCharts } from "./VitalsTrendCharts";


const TABS = ["summary", "visits", "medications", "labs", "documents", "trends"] as const;
type Tab = (typeof TABS)[number];

export function PatientChartTabs({ patient }: { patient: Patient }) {
  // The same queries the tabs use, so the counts cost no extra requests.
  const visits = useQuery(patientQueries.encounters(patient.id)).data?.length ?? 0;
  const labs = useQuery(patientQueries.labOrders(patient.id)).data?.length ?? 0;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "summary";

  // The tab lives in the URL so links like ?tab=labs open the right view and back/forward work.
  const setTab = (next: string) => router.replace(next === "summary" ? pathname : `${pathname}?tab=${next}`, { scroll: false });

  const count = (n: number) => n > 0 && <span className="ml-1 text-xs tabular-nums text-muted-foreground">{n}</span>;

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-6">
      <div className="overflow-x-auto border-b">
        <TabsList variant="line" className="h-11 gap-4 px-1">
          <TabsTrigger value="summary" className="flex-none px-1">Summary</TabsTrigger>
          <TabsTrigger value="visits" className="flex-none px-1">Visits{count(visits)}</TabsTrigger>
          <TabsTrigger value="medications" className="flex-none px-1">Medications</TabsTrigger>
          <TabsTrigger value="labs" className="flex-none px-1">Labs{count(labs)}</TabsTrigger>
          <TabsTrigger value="documents" className="flex-none px-1">Documents</TabsTrigger>
          <TabsTrigger value="trends" className="flex-none px-1">Trends</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="summary">
        <SummaryTab patient={patient} onShowTab={setTab} />
      </TabsContent>
      <TabsContent value="visits">
        <VisitsTab patientId={patient.id} />
      </TabsContent>
      <TabsContent value="medications">
        <MedicationsTab patient={patient} />
      </TabsContent>
      <TabsContent value="labs">
        <LabsTab patientId={patient.id} />
      </TabsContent>
      <TabsContent value="documents">
        <DocumentsTab patientId={patient.id} />
      </TabsContent>
      <TabsContent value="trends">
        <VitalsTrendCharts patientId={patient.id} />
      </TabsContent>
    </Tabs>
  );
}
