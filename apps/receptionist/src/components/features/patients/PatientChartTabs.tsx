"use client";

import { useState } from "react";
import { Patient, Appointment, Doctor } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemographicsTab } from "./tabs/DemographicsTab";
import { AppointmentsTab } from "./tabs/AppointmentsTab";

interface Props {
  patient: Patient;
  appointments: Appointment[];
  doctors: Doctor[];
}

export function PatientChartTabs({
  patient,
  appointments,
  doctors,
}: Props) {
  const [activeTab, setActiveTab] = useState("demographics");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white border-b px-2 py-0 h-auto w-full justify-start rounded-none space-x-6 overflow-x-auto scrollbar-none">
        <TabsTrigger
          value="demographics"
          className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary"
        >
          Demographics
        </TabsTrigger>
        <TabsTrigger
          value="appointments"
          className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-muted-foreground data-[state=active]:text-primary"
        >
          Appointments ({appointments.length})
        </TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="demographics" className="space-y-6 outline-none">
          <DemographicsTab patient={patient} />
        </TabsContent>

        <TabsContent value="appointments" className="outline-none">
          <AppointmentsTab appointments={appointments} doctors={doctors} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
