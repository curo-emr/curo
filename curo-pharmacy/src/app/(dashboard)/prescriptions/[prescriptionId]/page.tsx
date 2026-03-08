import { notFound } from "next/navigation";
import { getPrescriptionById, getPatientById, getDispensingRecordsByPrescription, getMedications, getPharmacyStaff } from "@/lib/data/api";
import { formatDate, formatDateTime, formatStatus, formatCurrency, getStaffName, getMedicationName, calculateAge } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { User, Phone, AlertTriangle, Pill, FileText, ClipboardList, Stethoscope } from "lucide-react";

export default async function PrescriptionDetailPage({ params }: { params: Promise<{ prescriptionId: string }> }) {
  const { prescriptionId } = await params;
  const prescription = await getPrescriptionById(prescriptionId);
  if (!prescription) notFound();

  const [patient, dispensingRecords, medications, staff] = await Promise.all([
    getPatientById(prescription.patientId),
    getDispensingRecordsByPrescription(prescriptionId),
    getMedications(),
    getPharmacyStaff(),
  ]);

  if (!patient) notFound();

  const age = calculateAge(patient.dob);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Prescription Header */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900">{prescription.prescriptionNumber}</h1>
                <StatusBadge status={prescription.status} />
                <Badge variant="outline" className={
                  prescription.priority === 'stat' ? 'text-status-error-text border-status-error-border bg-status-error-bg' :
                  prescription.priority === 'urgent' ? 'text-status-warning-text border-status-warning-border bg-status-warning-bg' :
                  'text-muted-foreground border bg-muted'
                }>
                  {prescription.priority.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Prescribed by <strong className="text-foreground">{prescription.doctorName}</strong> ({prescription.doctorRegistration})
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prescribed: {formatDateTime(prescription.prescribedAt)} &middot; Received: {formatDateTime(prescription.receivedAt)}
                {prescription.dispensedAt && ` · Dispensed: ${formatDateTime(prescription.dispensedAt)}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Info */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <span className="font-bold text-foreground">{patient.name.full}</span>
                    <Badge variant="outline" className="text-muted-foreground">{patient.mrn}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span>{age}y / {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}</span>
                    <span>NIC: {patient.nic}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.phone}</span>
                  </div>
                  {patient.allergies.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <AlertTriangle className="h-4 w-4 text-status-error-text" />
                      <span className="text-sm font-medium text-status-error-text">
                        Allergies: {patient.allergies.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prescription Items */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4 text-green-600" />
                Prescribed Medications ({prescription.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {prescription.items.map(item => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{item.drugName}</span>
                          {item.genericAllowed && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Generic OK</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-muted-foreground mt-2">
                          <div>
                            <span className="text-xs opacity-70">Dose</span>
                            <p className="font-medium text-foreground">{item.dose}</p>
                          </div>
                          <div>
                            <span className="text-xs opacity-70">Frequency</span>
                            <p className="font-medium text-foreground">{item.frequency}</p>
                          </div>
                          <div>
                            <span className="text-xs opacity-70">Duration</span>
                            <p className="font-medium text-foreground">{item.duration}</p>
                          </div>
                          <div>
                            <span className="text-xs opacity-70">Quantity</span>
                            <p className="font-medium text-foreground">{item.quantity}</p>
                          </div>
                        </div>
                        {item.instructions && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded px-3 py-2">
                            <strong>Instructions:</strong> {item.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dispensing Records */}
          {dispensingRecords.length > 0 && (
            <Card className="shadow-sm border">
              <CardHeader className="bg-muted/50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-purple-600" />
                  Dispensing Record
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {dispensingRecords.map(record => (
                  <div key={record.id}>
                    <div className="p-4 border-b bg-muted/30">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                        <span>Dispensed by: <strong className="text-foreground">{getStaffName(record.dispensedBy, staff)}</strong></span>
                        <span>Verified by: <strong className="text-foreground">{getStaffName(record.verifiedBy, staff)}</strong></span>
                        <span>{formatDateTime(record.dispensedAt)}</span>
                        <span>Total: <strong className="text-foreground">{formatCurrency(record.totalAmount)}</strong></span>
                      </div>
                    </div>
                    <div className="divide-y">
                      {record.items.map(item => (
                        <div key={item.prescriptionItemId} className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{item.drugNameDispensed}</span>
                            <span className="text-sm text-muted-foreground">
                              {item.quantityDispensed} / {item.quantityPrescribed}
                              {item.quantityDispensed < item.quantityPrescribed && (
                                <Badge variant="outline" className="ml-2 bg-status-warning-bg text-status-warning-text border-status-warning-border">
                                  Short
                                </Badge>
                              )}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                            {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                            {item.expiryDate && <span>Exp: {formatDate(item.expiryDate)}</span>}
                          </div>
                          {item.substitution && (
                            <p className="text-xs text-status-purple-text bg-status-purple-bg rounded px-2 py-1 mt-2">
                              Substitution: {item.substitution}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {record.counsellingNotes && (
                      <div className="p-4 border-t bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Counselling Notes:</strong> {record.counsellingNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Diagnosis */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                Diagnosis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-foreground">{prescription.diagnosis}</p>
            </CardContent>
          </Card>

          {/* Clinical Notes */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Clinical Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{prescription.clinicalNotes}</p>
            </CardContent>
          </Card>

          {/* Prescription Info */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <CardTitle className="text-base">Prescription Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Generic Allowed</span>
                  <span className="text-sm font-medium text-foreground">{prescription.genericAllowed ? 'Yes' : 'No'}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Items</span>
                  <span className="text-sm font-medium text-foreground">{prescription.items.length}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={prescription.status} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
