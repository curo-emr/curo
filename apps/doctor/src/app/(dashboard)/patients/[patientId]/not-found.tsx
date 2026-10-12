import { PatientNotFound } from "@curo/web/ui/patient-not-found";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return <PatientNotFound href={ROUTES.PATIENTS} />;
}
