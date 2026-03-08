import { notFound } from "next/navigation";
import {
  getEncounterById,
  getDoctors,
  getPrescriptionsByEncounter,
  getLabOrdersByEncounter,
  getLabTestCatalog,
} from "@/lib/data/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Stethoscope,
  Activity,
  FileText,
  Pill,
  FlaskConical,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { formatDate, getDoctorName, calculateBMI, getBMICategory, getTestName } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Props {
  params: Promise<{ visitId: string }>;
}

export default async function VisitDetailPage({ params }: Props) {
  const { visitId } = await params;
  const [encounter, doctors, labTestCatalog] = await Promise.all([
    getEncounterById(visitId),
    getDoctors(),
    getLabTestCatalog(),
  ]);

  if (!encounter) {
    notFound();
  }

  const [prescriptions, labOrders] = await Promise.all([
    getPrescriptionsByEncounter(encounter.id),
    getLabOrdersByEncounter(encounter.id),
  ]);

  const vitals = encounter.vitals;
  const bmi = vitals.heightCm && vitals.weightKg
    ? calculateBMI(vitals.heightCm, vitals.weightKg)
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link href={ROUTES.VISITS}>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Visits
        </Button>
      </Link>

      {/* Visit Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{encounter.chiefComplaint}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {getDoctorName(encounter.doctorId, doctors)} &middot; {formatDate(encounter.startedAt)}
          </p>
        </div>
        <StatusBadge status={encounter.status} />
      </div>

      {/* Vitals */}
      {vitals && Object.keys(vitals).length > 0 && (
        <SectionCard icon={Activity} iconClassName="text-status-error-text" title="Vitals Recorded">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {vitals.bpSystolic && vitals.bpDiastolic && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Blood Pressure</p>
                <p className="font-semibold">{vitals.bpSystolic}/{vitals.bpDiastolic} mmHg</p>
              </div>
            )}
            {vitals.pulseBpm && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Pulse</p>
                <p className="font-semibold">{vitals.pulseBpm} bpm</p>
              </div>
            )}
            {vitals.respirationRpm && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Respiration</p>
                <p className="font-semibold">{vitals.respirationRpm} rpm</p>
              </div>
            )}
            {vitals.temperatureC && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                <p className="font-semibold">{vitals.temperatureC}&deg;C</p>
              </div>
            )}
            {vitals.spo2Percent && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">SpO2</p>
                <p className="font-semibold">{vitals.spo2Percent}%</p>
              </div>
            )}
            {vitals.heightCm && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Height</p>
                <p className="font-semibold">{vitals.heightCm} cm</p>
              </div>
            )}
            {vitals.weightKg && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Weight</p>
                <p className="font-semibold">{vitals.weightKg} kg</p>
              </div>
            )}
            {bmi && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">BMI</p>
                <p className="font-semibold">{bmi} <span className="text-xs font-normal text-muted-foreground">({getBMICategory(bmi)})</span></p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Clinical Notes */}
      <SectionCard icon={FileText} iconClassName="text-primary" title="Visit Summary">
        <div className="space-y-4">
          {encounter.soap.assessment && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Assessment</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{encounter.soap.assessment}</p>
            </div>
          )}
          {encounter.soap.plan && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Plan</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{encounter.soap.plan}</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Diagnoses */}
      {encounter.diagnoses.length > 0 && (
        <SectionCard icon={Stethoscope} iconClassName="text-primary" title="Diagnoses">
          <div className="space-y-2">
            {encounter.diagnoses.map((dx, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{dx.name}</p>
                  {dx.isPrimary && (
                    <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px]">Primary</Badge>
                  )}
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">{dx.icdCode}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <SectionCard icon={Pill} iconClassName="text-status-success-text" title="Prescriptions">
          {prescriptions.map(rx => (
            <div key={rx.id} className="space-y-2">
              {rx.items.map(item => (
                <div key={item.id} className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium text-foreground">{item.displayName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.dose} &middot; {item.route} &middot; {item.frequency} &middot; {item.durationDays} days
                  </p>
                  {item.instructions && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{item.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </SectionCard>
      )}

      {/* Lab Orders */}
      {labOrders.length > 0 && (
        <SectionCard icon={FlaskConical} iconClassName="text-indigo-500" title="Lab Orders">
          {labOrders.map(lab => (
            <div key={lab.id} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={lab.status} />
                {lab.priority !== "routine" && (
                  <Badge className="bg-status-error-bg text-status-error-text border-status-error-border text-[10px] uppercase">
                    {lab.priority}
                  </Badge>
                )}
              </div>
              {lab.tests.map(test => (
                <div key={test.testId} className="p-3 rounded-lg bg-muted flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{getTestName(test.testId, labTestCatalog)}</p>
                  {test.result ? (
                    <span className="text-sm text-status-success-text font-medium">{test.result}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}
