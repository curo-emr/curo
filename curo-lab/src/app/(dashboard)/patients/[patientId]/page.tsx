import { notFound } from "next/navigation";
import { getPatientById, getLabOrdersByPatient, getLabResultsByPatient, getLabTestCatalog, getLabStaff } from "@/lib/data/api";
import { calculateAge, formatDate, getTestName, getStaffName, getResultFlagColor, getResultFlagLabel, formatStatus } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { User, Phone, Mail, MapPin, FlaskConical, FileText } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default async function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = await getPatientById(patientId);
  if (!patient) notFound();

  const age = calculateAge(patient.dob);
  const [orders, results, testCatalog, staff] = await Promise.all([
    getLabOrdersByPatient(patientId),
    getLabResultsByPatient(patientId),
    getLabTestCatalog(),
    getLabStaff(),
  ]);

  const sortedOrders = [...orders].sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Patient Header */}
      <Card className="shadow-sm border-slate-200">
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
                <span>Blood Type: <strong className="text-slate-700">{patient.bloodType}</strong></span>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.phone}</span>
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {patient.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-md mb-4">
          <TabsTrigger value="orders" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FlaskConical className="h-4 w-4 mr-2" /> Lab Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 mr-2" /> Results History ({results.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          {sortedOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No lab orders found for this patient.</div>
          ) : (
            sortedOrders.map(order => (
              <Card key={order.id} className="shadow-sm border-slate-200 hover:bg-slate-50/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-slate-900">{order.accessionNumber}</span>
                        <StatusBadge status={order.status} />
                        <Badge variant="outline" className={
                          order.priority === 'stat' ? 'text-red-700 border-red-200 bg-red-50' :
                          order.priority === 'urgent' ? 'text-amber-700 border-amber-200 bg-amber-50' :
                          'text-slate-600 border-slate-200 bg-slate-50'
                        }>
                          {order.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {order.tests.map(t => getTestName(t.testId, testCatalog)).join(', ')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Ordered: {formatDate(order.orderedAt)} | {order.doctorName}
                      </p>
                    </div>
                    <Link href={ROUTES.ORDER(order.id)}>
                      <Button variant="outline" size="sm" className="shrink-0">View</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No results available for this patient.</div>
          ) : (
            results.map(result => {
              const test = testCatalog.find(t => t.id === result.testId);
              return (
                <Card key={result.id} className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-slate-900">{test?.name || result.testId}</span>
                      <span className="text-xs text-slate-400">{formatDate(result.performedAt)}</span>
                    </div>
                    <div className="bg-slate-50 rounded-md p-3 space-y-1.5">
                      {result.values.map(val => {
                        const component = test?.components.find(c => c.id === val.componentId);
                        return (
                          <div key={val.componentId} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{component?.name || val.componentId}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{val.value} {component?.unit}</span>
                              {val.flag !== 'normal' && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getResultFlagColor(val.flag)}`}>
                                  {getResultFlagLabel(val.flag)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {result.verifiedBy && (
                      <p className="text-xs text-slate-400 mt-2">
                        Verified by: {getStaffName(result.verifiedBy, staff)} | {result.verifiedAt ? formatDate(result.verifiedAt) : ''}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
