"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ScheduleClient } from "./ScheduleClient";
import { getDoctors } from "@/lib/api/practitioners";
import type { Doctor } from "@/types";

export default function SchedulePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <ScheduleClient doctors={doctors} />;
}
