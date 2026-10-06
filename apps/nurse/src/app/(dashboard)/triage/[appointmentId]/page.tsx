import { TriageWorkspace } from "@/components/features/triage/TriageWorkspace";

export default async function TriagePage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  return <TriageWorkspace appointmentId={appointmentId} />;
}
