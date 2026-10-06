import { Suspense } from "react";
import { TriageQueue } from "@/components/features/queue/TriageQueue";

export default function TriageQueuePage() {
  // useSearchParams (the ?q= filter from the top bar) needs a Suspense boundary.
  return (
    <Suspense>
      <TriageQueue />
    </Suspense>
  );
}
