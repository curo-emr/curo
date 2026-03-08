import { notFound } from "next/navigation";
import { getPatientById, getPrescriptionsByPatient, getDispensingRecordsByPatient, getPharmacyStaff } from "@/lib/data/api";
import { calculateAge, formatDate, formatDateTime, formatCurrency, getStaffName, formatStatus } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { User, Phone, Mail, MapPin, Pill, FileText, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default async function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = await getPatientById(patientId);
  if (!patient) notFound();

  const age = calculateAge(patient.dob);
  const [prescriptions, dispensingRecords, staff] = await Promise.all([
    getPrescriptionsByPatient(patientId),
    getDispensingRecordsByPatient(patientId),
    getPharmacyStaff(),
  ]);

  const sortedPrescriptions = [...prescriptions].sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Patient Header */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-slate-900">{patient.name.full}</h1>
                <Badge variant="outline" className="text-slate-600">{patient.mrn}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                <span>{age}y / {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}</span>
                <span>NIC: {patient.nic}</span>
                <span>Blood Type: <strong className="text-slate-700">{patient.bloodType}</strong></span>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.phone}</span>
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {patient.email}</span>
              </div>
              {patient.allergies.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <AlertTriangle className="h-4 w-4 text-status-error-text" />
                  <span className="text-sm font-medium text-status-error-text">
                    Allergies: {patient.allergies.join(', ')}
                  </span>
                </div>
              )}
              {patient.currentMedications.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <Pill className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Current: {patient.currentMedications.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="prescriptions" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-md mb-4">
          <TabsTrigger value="prescriptions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Pill className="h-4 w-4 mr-2" /> Prescriptions ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="dispensing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 mr-2" /> Dispensing History ({dispensingRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="space-y-3">
          {sortedPrescriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No prescriptions found for this patient.</div>
          ) : (
            sortedPrescriptions.map(rx => (
              <Card key={rx.id} className="shadow-sm border hover:bg-slate-50/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-slate-900">{rx.prescriptionNumber}</span>
                        <StatusBadge status={rx.status} />
                        <Badge variant="outline" className={
                          rx.priority === 'stat' ? 'text-red-700 border-red-200 bg-red-50' :
                          rx.priority === 'urgent' ? 'text-amber-700 border-amber-200 bg-amber-50' :
                          'text-slate-600 border-slate-200 bg-slate-50'
                        }>
                          {rx.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {rx.items.map(i => i.drugName).join(', ')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {rx.doctorName} | Prescribed: {formatDate(rx.prescribedAt)} | Dx: {rx.diagnosis}
                      </p>
                    </div>
                    <Link href={ROUTES.PRESCRIPTION(rx.id)}>
                      <Button variant="outline" size="sm" className="shrink-0">View</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="dispensing" className="space-y-3">
          {dispensingRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No dispensing records for this patient.</div>
          ) : (
            dispensingRecords.map(record => (
              <Card key={record.id} className="shadow-sm border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-slate-900">{record.prescriptionId.replace('rx_', 'RX-')}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(record.dispensedAt)}</span>
                  </div>
                  <div className="bg-slate-50 rounded-md p-3 space-y-1.5">
                    {record.items.map(item => (
                      <div key={item.prescriptionItemId} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{item.drugNameDispensed}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">x{item.quantityDispensed}</span>
                          {item.substitution && (
                            <Badge variant="outline" className="text-xs bg-status-purple-bg text-status-purple-text border-status-purple-border">
                              Substituted
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                    <span>Dispensed by: {getStaffName(record.dispensedBy, staff)}</span>
                    <span className="font-medium text-slate-600">{formatCurrency(record.totalAmount)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
