import { PageHeader } from "@curo/web/ui/page-header";
import { ICDSearchClient } from "./ICDSearchClient";

export default function ICDPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="ICD-10-CM lookup" description="Find a diagnosis code by its code or the words in its name." />
      <ICDSearchClient />
    </div>
  );
}
