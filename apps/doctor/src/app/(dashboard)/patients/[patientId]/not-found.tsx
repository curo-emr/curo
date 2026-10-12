import { PatientNotFound } from "@curo/web/ui/record-not-found";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return <PatientNotFound href={ROUTES.PATIENTS} />;
}
