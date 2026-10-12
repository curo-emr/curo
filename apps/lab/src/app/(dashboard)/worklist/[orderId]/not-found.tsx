import { RecordNotFound } from "@curo/web/ui/record-not-found";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return <RecordNotFound record="Order" href={ROUTES.WORKLIST} backLabel="Back to worklist" />;
}
