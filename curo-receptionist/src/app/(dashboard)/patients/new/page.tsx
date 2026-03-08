import { PatientRegistrationForm } from "@/components/features/patients/PatientRegistrationForm";

export default function NewPatientPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Register New Patient</h1>
        <p className="text-sm text-muted-foreground mt-1">Fill in the patient details to create a new record.</p>
      </div>
      <PatientRegistrationForm />
    </div>
  );
}
