import { notFound } from "next/navigation";
import { 
  getEncounterById, 
  getPatientById,
  getPrescriptionsByEncounter,
  getLabOrdersByEncounter
} from "@/lib/data/api";
import { calculateBMI, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Stethoscope, FileText, Pill, Beaker, CheckCircle2, Droplet, Thermometer, Box, FileSignature, Activity } from "lucide-react";

export default async function EncounterDetailsPage({ params }: { params: { patientId: string, encounterId: string } }) {
  const { patientId, encounterId } = await params;
  
  const [encounter, patient, prescriptions, labOrders] = await Promise.all([
    getEncounterById(encounterId),
    getPatientById(patientId),
    getPrescriptionsByEncounter(encounterId),
    getLabOrdersByEncounter(encounterId)
  ]);

  if (!encounter || !patient) {
    notFound();
  }

  const bmi = encounter.vitals?.heightCm && encounter.vitals?.weightKg 
    ? calculateBMI(encounter.vitals.heightCm, encounter.vitals.weightKg) 
    : null;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'in_progress': return <Badge variant="default" className="bg-blue-100 text-blue-700">In Progress</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/patients/${patientId}`} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Encounter Details</h1>
            {getStatusBadge(encounter.status)}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-semibold">{patient.name.full}</span> • {formatDate(encounter.startedAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content Column (SOAP + Diagnoses) */}
        <div className="md:col-span-2 space-y-6">
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-indigo-600" /> SOAP Note
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">Subjective</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{encounter.soap.subjective || "No notes."}</p>
                </div>
                <div className="p-5 bg-slate-50/30">
                  <h4 className="font-semibold text-slate-900 mb-2">Objective</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{encounter.soap.objective || "No notes."}</p>
                </div>
                <div className="p-5">
                  <h4 className="font-semibold text-slate-900 mb-2">Assessment</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{encounter.soap.assessment || "No notes."}</p>
                </div>
                <div className="p-5 bg-slate-50/30">
                  <h4 className="font-semibold text-slate-900 mb-2">Plan</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{encounter.soap.plan || "No notes."}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 outline outline-1 outline-blue-100">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-600" /> Diagnoses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {encounter.diagnoses.map((d, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{d.name}</span>
                        {d.isPrimary && <Badge className="bg-blue-100 text-blue-700 text-[10px] uppercase">Primary</Badge>}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">ICD-10: {d.icdCode}</span>
                    </div>
                  </div>
                ))}
                {encounter.diagnoses.length === 0 && (
                  <div className="p-4 text-sm text-slate-500 text-center">No diagnoses recorded for this encounter.</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Sidebar Column (Vitals, Meds, Labs) */}
        <div className="space-y-6">
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-500" /> Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400 text-xs mb-1">Blood Pressure</div>
                  <div className="font-medium">{encounter.vitals?.bpSystolic}/{encounter.vitals?.bpDiastolic} mmHg</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Pulse</div>
                  <div className="font-medium">{encounter.vitals?.pulseBpm} bpm</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Respiration</div>
                  <div className="font-medium">{encounter.vitals?.respirationRpm} rpm</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Temperature</div>
                  <div className="font-medium">{encounter.vitals?.temperatureC} °C</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">SpO2</div>
                  <div className="font-medium">{encounter.vitals?.spo2Percent}%</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Weight</div>
                  <div className="font-medium">{encounter.vitals?.weightKg} kg</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Height</div>
                  <div className="font-medium">{encounter.vitals?.heightCm} cm</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">BMI</div>
                  <div className="font-medium">{bmi || '--'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-500" /> Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={rx.status === 'sent_to_pharmacy' ? 'border-green-200 bg-green-50 text-green-700' : ''}>
                        {rx.status.split('_').join(' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-400">{formatDate(rx.createdAt)}</span>
                    </div>
                    <ul className="space-y-3">
                      {rx.items.map((item, i) => (
                        <li key={i} className="text-sm">
                          <div className="font-medium text-slate-900">{item.displayName}</div>
                          <div className="text-slate-600 mb-1">{item.dose} • {item.route} • {item.frequency} for {item.durationDays} days</div>
                          <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">Sig: {item.instructions}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {prescriptions.length === 0 && (
                  <div className="p-4 text-sm text-slate-500 text-center">No prescriptions issued.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Beaker className="h-5 w-5 text-purple-500" /> Lab Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-slate-100">
                {labOrders.map(lab => (
                  <div key={lab.id} className="p-4">
                     <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={lab.status === 'results_pending' ? 'border-orange-200 bg-orange-50 text-orange-700' : ''}>
                        {lab.status.split('_').join(' ').toUpperCase()}
                      </Badge>
                      {lab.priority === 'urgent' && <Badge className="bg-red-50 text-red-700 border-red-200">URGENT</Badge>}
                    </div>
                    <div className="text-sm font-medium text-slate-900 mb-1">Tests Ordered:</div>
                    <ul className="list-disc pl-5 text-sm text-slate-600 mb-2">
                      {lab.tests.map((t, index) => (
                        <li key={index}>{t.testId} - <span className="text-slate-400 text-xs">({t.status})</span></li>
                      ))}
                    </ul>
                    {lab.notesToLab && <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded mt-2">Note: {lab.notesToLab}</div>}
                  </div>
                ))}
                {labOrders.length === 0 && (
                  <div className="p-4 text-sm text-slate-500 text-center">No lab orders.</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
