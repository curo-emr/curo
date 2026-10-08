"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Allergy, Encounter, LabOrder, Patient, Prescription, Problem, Vitals } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { SummaryTab } from "./tabs/SummaryTab";
import { VisitsTab } from "./tabs/VisitsTab";
import { MedicationsTab } from "./tabs/MedicationsTab";
import { LabsTab } from "./tabs/LabsTab";
import { DocumentsTab } from "../documents/DocumentsTab";
import { VitalsTrendCharts } from "./VitalsTrendCharts";

interface Props {
  patient: Patient;
  encounters: Encounter[];
  allergies: Allergy[] | null;
  problems: Problem[];
  labOrders: LabOrder[];
  prescriptions: Prescription[];
  latestVitals: { vitals: Partial<Vitals>; recordedAt: string | null };
}

const TABS = ["summary", "visits", "medications", "labs", "documents", "trends"] as const;
type Tab = (typeof TABS)[number];

export function PatientChartTabs({ patient, encounters, allergies, problems, labOrders, prescriptions, latestVitals }: Props) {
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
          <TabsTrigger value="visits" className="flex-none px-1">Visits{count(encounters.length)}</TabsTrigger>
          <TabsTrigger value="medications" className="flex-none px-1">Medications</TabsTrigger>
          <TabsTrigger value="labs" className="flex-none px-1">Labs{count(labOrders.length)}</TabsTrigger>
          <TabsTrigger value="documents" className="flex-none px-1">Documents</TabsTrigger>
          <TabsTrigger value="trends" className="flex-none px-1">Trends</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="summary">
        <SummaryTab patient={patient} allergies={allergies} problems={problems} encounters={encounters}
          prescriptions={prescriptions} latestVitals={latestVitals} onShowTab={setTab} />
      </TabsContent>
      <TabsContent value="visits">
        <VisitsTab patientId={patient.id} encounters={encounters} problems={problems} />
      </TabsContent>
      <TabsContent value="medications">
        <MedicationsTab prescriptions={prescriptions} patient={patient} />
      </TabsContent>
      <TabsContent value="labs">
        <LabsTab labOrders={labOrders} />
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
