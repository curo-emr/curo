"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { appointmentQueries } from "@/lib/queries";
import { useDoctors } from "@/lib/hooks/useDoctors";
import type { Patient } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { DemographicsTab } from "./tabs/DemographicsTab";
import { AppointmentsTab } from "./tabs/AppointmentsTab";

export function PatientChartTabs({ patient }: { patient: Patient }) {
  const [activeTab, setActiveTab] = useState("demographics");
  const appointments = useQuery(appointmentQueries.forPatient(patient.id));
  const doctors = useDoctors();

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
          {appointments.data ? `Appointments (${appointments.data.length})` : "Appointments"}
        </TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="demographics" className="space-y-6 outline-none">
          <DemographicsTab patient={patient} />
        </TabsContent>

        <TabsContent value="appointments" className="outline-none">
          <QueryContent query={appointments} what="appointments">
            {appts => <AppointmentsTab appointments={appts} doctors={doctors} />}
          </QueryContent>
        </TabsContent>
      </div>
    </Tabs>
  );
}
