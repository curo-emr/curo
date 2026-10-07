import { Button } from "@curo/web/ui/button";
import { UserX } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function PatientNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-slate-100 p-4 rounded-full mb-6">
        <UserX className="h-10 w-10 text-slate-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Patient Not Found</h2>
      <p className="text-slate-500 mb-6 max-w-md">
        The patient record you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <Link href={ROUTES.PATIENTS}>
        <Button variant="outline">Back to Patient Directory</Button>
      </Link>
    </div>
  );
}
