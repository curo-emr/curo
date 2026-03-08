import { notFound } from "next/navigation";
import { getPrescriptionById, getDoctors } from "@/lib/data/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, ArrowLeft, Clock, User } from "lucide-react";
import Link from "next/link";
import { formatDate, getDoctorName } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { SectionCard } from "@/components/ui/SectionCard";

interface Props {
  params: Promise<{ prescriptionId: string }>;
}

export default async function PrescriptionDetailPage({ params }: Props) {
  const { prescriptionId } = await params;
  const [prescription, doctors] = await Promise.all([
    getPrescriptionById(prescriptionId),
    getDoctors(),
  ]);

  if (!prescription) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href={ROUTES.PRESCRIPTIONS}>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">

          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Prescriptions
        </Button>
      </Link>

      {/* Prescription Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Prescription Details</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {getDoctorName(prescription.doctorId, doctors)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(prescription.createdAt)}
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            prescription.status === "sent_to_pharmacy"
              ? "text-status-success-text border-status-success-border bg-status-success-bg"
              : "text-muted-foreground border bg-muted"
          }
        >
          {prescription.status === "sent_to_pharmacy" ? "Sent to Pharmacy" : "Draft"}
        </Badge>
      </div>

      {/* Medications */}
      <SectionCard icon={Pill} iconClassName="text-status-success-text" title="Medications">
        <div className="space-y-4">
          {prescription.items.map((item, idx) => (
            <Card key={item.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-status-success-bg text-status-success-text text-xs">
                        #{idx + 1}
                      </Badge>
                      <h4 className="font-semibold text-sm text-foreground">{item.displayName}</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Dose</p>
                        <p className="font-medium">{item.dose}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Route</p>
                        <p className="font-medium capitalize">{item.route}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Frequency</p>
                        <p className="font-medium capitalize">{item.frequency}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium">{item.durationDays} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Qty: {item.quantity}</span>
                    </div>
                    {item.instructions && (
                      <div className="mt-2 p-2 rounded-md bg-primary/10 text-xs text-primary">
                        <span className="font-medium">Instructions:</span> {item.instructions}
                      </div>
                    )}
                    {item.substitutes.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Substitutes:</span>{" "}
                        {item.substitutes.map(s => s.displayName).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>

      {/* Pharmacy Notes */}
      {prescription.notesToPharmacy && (
        <Card className="shadow-sm border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Notes to Pharmacy:</span>{" "}
              {prescription.notesToPharmacy}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
