"use client";

import { useState } from "react";
import { Patient, Encounter, Allergy, Problem, LabOrder, Prescription, LabTestCatalogItem } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./tabs/OverviewTab";
import { EncountersTab } from "./tabs/EncountersTab";
import { ProblemsTab } from "./tabs/ProblemsTab";
import { AllergiesTab } from "./tabs/AllergiesTab";
import { MedicationsTab } from "./tabs/MedicationsTab";
import { LabsTab } from "./tabs/LabsTab";
import { DocumentsTab } from "../documents/DocumentsTab";
import { VitalsTrendCharts } from "./VitalsTrendCharts";

interface Props {
  patient: Patient;
  encounters: Encounter[];
  allergies: Allergy[];
  problems: Problem[];
  labOrders: LabOrder[];
  prescriptions: Prescription[];
  labTestCatalog: LabTestCatalogItem[];
  initialTab?: string;
}

export function PatientChartTabs({
  patient,
  encounters,
  allergies,
  problems,
  labOrders,
  prescriptions,
  labTestCatalog,
  initialTab = "overview",
}: Props) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white border-b px-2 py-0 h-auto w-full justify-start rounded-none space-x-6 overflow-x-auto scrollbar-none">
        <TabsTrigger value="overview" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary">Overview</TabsTrigger>
        <TabsTrigger value="encounters" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary">Encounters ({encounters.length})</TabsTrigger>
        <TabsTrigger value="problems" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary">Problems ({problems.length})</TabsTrigger>
        <TabsTrigger value="allergies" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary">Allergies ({allergies.length})</TabsTrigger>
        <TabsTrigger value="medications" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary">Medications</TabsTrigger>
        <TabsTrigger value="labs" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary">Labs & Reports ({labOrders.length})</TabsTrigger>
        <TabsTrigger value="documents" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary">Documents</TabsTrigger>
        <TabsTrigger value="trends" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary">Trends</TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="overview" className="space-y-6 outline-none">
          <OverviewTab
            patient={patient}
            encounters={encounters}
            problems={problems}
            setActiveTab={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="encounters" className="space-y-4 outline-none">
          <EncountersTab patient={patient} encounters={encounters} />
        </TabsContent>

        <TabsContent value="problems" className="outline-none">
          <ProblemsTab problems={problems} />
        </TabsContent>

        <TabsContent value="allergies" className="outline-none">
          <AllergiesTab allergies={allergies} />
        </TabsContent>

        <TabsContent value="medications" className="outline-none">
          <MedicationsTab prescriptions={prescriptions} patient={patient} />
        </TabsContent>

        <TabsContent value="labs" className="outline-none">
          <LabsTab labOrders={labOrders} labTestCatalog={labTestCatalog} />
        </TabsContent>

        <TabsContent value="documents" className="outline-none">
          <DocumentsTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="trends" className="outline-none">
          <VitalsTrendCharts patientId={patient.id} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
