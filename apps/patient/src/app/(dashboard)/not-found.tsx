import { PageNotFound } from "@curo/web/ui/record-not-found";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return <PageNotFound href={ROUTES.HOME} backLabel="Back to home" />;
}
