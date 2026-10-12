import { RecordNotFound } from "@curo/web/ui/record-not-found";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return <RecordNotFound record="Prescription" href={ROUTES.PRESCRIPTIONS} backLabel="Back to prescriptions" />;
}
