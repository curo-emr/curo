import { notFound } from "next/navigation";
import { getLabOrderById, getPatientById, getLabTestCatalog, getLabResultsByOrder, getLabStaff, getLabInstruments } from "@/lib/data/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { calculateAge, formatDate, getTestName, getStaffName, getResultFlagColor, getResultFlagLabel, formatStatus } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";
import { User, Stethoscope, FileText, FlaskConical, Clock, Barcode, AlertTriangle } from "lucide-react";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getLabOrderById(orderId);
  if (!order) notFound();

  const [patient, testCatalog, results, staff, instruments] = await Promise.all([
    getPatientById(order.patientId),
    getLabTestCatalog(),
    getLabResultsByOrder(orderId),
    getLabStaff(),
    getLabInstruments(),
  ]);

  if (!patient) notFound();

  const age = calculateAge(patient.dob);

  const statusTimeline = [
    { label: "Ordered", time: order.orderedAt, done: true },
    { label: "Received", time: order.receivedAt, done: true },
    { label: "Collected", time: order.collectedAt, done: !!order.collectedAt },
    { label: "Processing", time: null, done: ['processing', 'resulted', 'verified', 'dispatched'].includes(order.status) },
    { label: "Resulted", time: null, done: ['resulted', 'verified', 'dispatched'].includes(order.status) },
    { label: "Verified", time: null, done: ['verified', 'dispatched'].includes(order.status) },
    { label: "Dispatched", time: null, done: order.status === 'dispatched' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{order.accessionNumber}</h1>
            <StatusBadge status={order.status} />
            <Badge variant="outline" className={
              order.priority === 'stat' ? 'text-red-700 border-red-200 bg-red-50' :
              order.priority === 'urgent' ? 'text-amber-700 border-amber-200 bg-amber-50' :
              'text-slate-600 border-slate-200 bg-slate-50'
            }>
              {order.priority.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {(order.status === 'processing' || order.status === 'collected') && (
            <Link href={ROUTES.ORDER_RESULTS(order.id)}>
              <Button className="bg-blue-600 hover:bg-blue-700">Enter Results</Button>
            </Link>
          )}
          <Link href={ROUTES.WORKLIST}>
            <Button variant="outline">Back to Worklist</Button>
          </Link>
        </div>
      </div>

      {order.status === 'rejected' && order.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Order Rejected</p>
            <p className="text-sm text-red-700 mt-0.5">{order.rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Info */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-blue-600" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Name</p>
                  <p className="font-medium text-slate-900">{patient.name.full}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">MRN</p>
                  <p className="font-medium text-slate-900">{patient.mrn}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Age / Sex</p>
                  <p className="font-medium text-slate-900">{age}y / {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Blood Type</p>
                  <p className="font-medium text-slate-900">{patient.bloodType}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Doctor & Clinical Notes */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                Ordering Physician
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-slate-900">{order.doctorName}</p>
              {order.clinicalNotes && (
                <div className="bg-slate-50 rounded-md p-3">
                  <p className="text-xs text-slate-400 mb-1">Clinical Notes</p>
                  <p className="text-sm text-slate-700">{order.clinicalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test List & Results */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="h-4 w-4 text-blue-600" />
                Tests & Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {order.tests.map(orderTest => {
                  const test = testCatalog.find(t => t.id === orderTest.testId);
                  const result = results.find(r => r.testId === orderTest.testId);

                  return (
                    <div key={orderTest.testId} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm text-slate-900">{test?.name || orderTest.testId}</span>
                          {test && <span className="text-xs text-slate-400 ml-2">({test.code})</span>}
                        </div>
                        {result ? (
                          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">Results Available</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Pending</Badge>
                        )}
                      </div>

                      {result && test && (
                        <div className="mt-2 bg-slate-50 rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left px-3 py-1.5 text-xs font-medium text-slate-500">Component</th>
                                <th className="text-left px-3 py-1.5 text-xs font-medium text-slate-500">Value</th>
                                <th className="text-left px-3 py-1.5 text-xs font-medium text-slate-500">Ref. Range</th>
                                <th className="text-left px-3 py-1.5 text-xs font-medium text-slate-500">Flag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.values.map(val => {
                                const component = test.components.find(c => c.id === val.componentId);
                                return (
                                  <tr key={val.componentId} className="border-b border-slate-100 last:border-0">
                                    <td className="px-3 py-1.5 text-slate-700">{component?.name || val.componentId}</td>
                                    <td className="px-3 py-1.5 font-medium text-slate-900">
                                      {val.value} {component?.unit}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-500">
                                      {component?.referenceRange.low !== 0 || component?.referenceRange.high !== 0
                                        ? `${component?.referenceRange.low} - ${component?.referenceRange.high}`
                                        : '-'}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      {val.flag !== 'normal' && (
                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getResultFlagColor(val.flag)}`}>
                                          {getResultFlagLabel(val.flag)}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-blue-600" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {statusTimeline.map((step, i) => (
                  <div key={step.label} className="flex items-start gap-3">
                    <div className={`h-3 w-3 rounded-full mt-1 shrink-0 ${step.done ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-xs text-slate-400">{formatDate(step.time)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Specimen Info */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Barcode className="h-4 w-4 text-blue-600" />
                Specimen Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Type</span>
                <span className="font-medium text-slate-900">{formatStatus(order.specimenType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Condition</span>
                <span className="font-medium text-slate-900">{order.specimenCondition ? formatStatus(order.specimenCondition) : 'N/A'}</span>
              </div>
              {order.collectedBy && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Collected By</span>
                  <span className="font-medium text-slate-900">{getStaffName(order.collectedBy, staff)}</span>
                </div>
              )}
              {order.collectedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Collected At</span>
                  <span className="font-medium text-slate-900">{formatDate(order.collectedAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Department</span>
                <span className="font-medium text-slate-900">{order.department}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
