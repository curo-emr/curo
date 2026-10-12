import { PageNotFound } from "@curo/web/ui/record-not-found";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return <PageNotFound href={ROUTES.DASHBOARD} backLabel="Back to today's patients" />;
}
