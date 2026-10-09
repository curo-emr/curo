import Link from "next/link";
import { UserX } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { ROUTES } from "@/lib/constants";

export default function PatientNotFound() {
  return (
    <Card className="mx-auto mt-12 max-w-lg">
      <EmptyState
        icon={UserX}
        title="Patient not found"
        description="There's no patient record at this address. It may have been mistyped or removed."
        action={<Button asChild variant="outline" size="sm"><Link href={ROUTES.PATIENTS}>All patients</Link></Button>}
      />
    </Card>
  );
}
