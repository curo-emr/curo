"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BookAppointmentForm } from "@/components/features/appointments/BookAppointmentForm";
import { PageHeader } from "@curo/web/ui/page-header";
import { getDoctors } from "@/lib/api/practitioners";
import type { Doctor } from "@/types";

export default function NewAppointmentPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Book Appointment" description="Schedule a new patient appointment" />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <BookAppointmentForm doctors={doctors} />
      )}
    </div>
  );
}
