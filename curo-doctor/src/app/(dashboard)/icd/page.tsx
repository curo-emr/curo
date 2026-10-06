import { PageHeader } from "@/components/ui/PageHeader";
import { ICDSearchClient } from "./ICDSearchClient";

export default function ICDPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="ICD-10 lookup" description="Find a diagnosis code by code, description or common clinical terms." />
      <ICDSearchClient />
    </div>
  );
}
