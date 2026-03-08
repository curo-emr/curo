import { getPatientPrescriptions, getDoctors } from "@/lib/data/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate, getDoctorName } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function PrescriptionsPage() {
  const [prescriptions, doctors] = await Promise.all([
    getPatientPrescriptions(),
    getDoctors(),
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Prescriptions"
        description="View all your e-prescriptions."
      />

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pill className="h-5 w-5 text-status-success-text" />
              All Prescriptions
            </CardTitle>
            <Badge variant="secondary" className="bg-status-success-bg text-status-success-text hover:bg-status-success-bg">
              {prescriptions.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {prescriptions.length === 0 ? (
              <EmptyState message="No prescriptions found." />
            ) : (
              prescriptions.map(rx => (
                <Link
                  key={rx.id}
                  href={ROUTES.PRESCRIPTION(rx.id)}
                  className="block p-4 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                          {rx.items.map(i => i.displayName).join(", ")}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getDoctorName(rx.doctorId, doctors)} &middot; {formatDate(rx.createdAt)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{rx.items.length} medication{rx.items.length !== 1 ? "s" : ""}</span>
                        <span>&middot;</span>
                        <span className="capitalize">{rx.status.replace("_", " ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-status-success-text border-status-success-border bg-status-success-bg">
                        {rx.items.length} item{rx.items.length !== 1 ? "s" : ""}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
