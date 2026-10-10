import { PageHeader } from "@curo/web/ui/page-header";
import { DispensingLogTable } from "@/components/features/dispensing/DispensingLogTable";

export default function DispensingLogPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Dispensing log" description="Every dispense from this pharmacy, latest first." />
      <DispensingLogTable />
    </div>
  );
}
