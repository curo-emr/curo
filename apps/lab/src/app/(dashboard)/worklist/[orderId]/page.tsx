"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Loader2, User, FlaskConical, Clock, ArrowLeft, CheckCircle2, QrCode, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { calculateAge, formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { getLabOrderById, getLabResultsByOrder, getLabTestCatalog, receiveOrder, type LabResult } from "@/lib/api/lab";
import { getPatientById } from "@/lib/api/patients";
import type { LabOrder, Patient, LabTestCatalogItem } from "@/types";

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [testCatalog, setTestCatalog] = useState<LabTestCatalogItem[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiving, setIsReceiving] = useState(false);

  const loadData = useCallback(async () => {
    const ord = await getLabOrderById(orderId);
    if (!ord) return;
    setOrder(ord);
    const [pt, catalog, res] = await Promise.all([
      getPatientById(ord.patientId),
      getLabTestCatalog(),
      getLabResultsByOrder(orderId, ord.patientId),
    ]);
    setPatient(pt);
    setTestCatalog(catalog);
    setResults(res);
  }, [orderId]);

  useEffect(() => {
    loadData().catch(console.error).finally(() => setIsLoading(false));
  }, [loadData]);

  const handleReceive = async () => {
    setIsReceiving(true);
    try {
      await receiveOrder(orderId);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsReceiving(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!order || !patient) return <div className="p-8 text-center text-slate-500">Order not found.</div>;

  const age = calculateAge(patient.dob);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{order.id.slice(0, 8).toUpperCase()}</h1>
            <StatusBadge status={order.status} />
            <Badge variant="outline" className={
              order.priority === 'stat' ? 'text-red-700 border-red-200 bg-red-50' :
              order.priority === 'urgent' ? 'text-amber-700 border-amber-200 bg-amber-50' :
              'text-slate-600 border-slate-200 bg-slate-50'
            }>{order.priority.toUpperCase()}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Ordered: {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'sent_to_lab' && (
            <Button onClick={handleReceive} disabled={isReceiving} className="bg-teal-600 hover:bg-teal-700">
              {isReceiving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Receiving...</> : "Mark as Received"}
            </Button>
          )}
          {(order.status === 'sent_to_lab' || order.status === 'draft') && (
            <Link href={ROUTES.ORDER_RESULTS(order.id)}>
              <Button className="bg-blue-600 hover:bg-blue-700">Enter Results</Button>
            </Link>
          )}
          <Link href={ROUTES.WORKLIST}>
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Info */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-blue-600" />Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-slate-400 text-xs">Name</p><p className="font-medium">{patient.name.full}</p></div>
                <div><p className="text-slate-400 text-xs">MRN</p><p className="font-medium">{patient.mrn}</p></div>
                <div><p className="text-slate-400 text-xs">Age / Sex</p><p className="font-medium">{age}y / {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}</p></div>
                <div><p className="text-slate-400 text-xs">PHN</p><p className="font-medium font-mono text-xs">{patient.phn || '—'}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Tests */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="h-4 w-4 text-blue-600" />Tests Ordered ({order.tests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {order.tests.map((test, i) => {
                  const catalogItem = testCatalog.find(t => t.id === test.testId || t.code === test.testId);
                  const orderResult = results.find(r => r.results?.some(rr => rr.testCode === test.testId));
                  return (
                    <div key={`${test.testId}:${i}`} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{test.name}</p>
                        {catalogItem && <p className="text-xs text-slate-400">{catalogItem.code} · {catalogItem.category}</p>}
                      </div>
                      {orderResult ? (
                        <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Results Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Pending</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sample QR labels — print and stick on each specimen tube */}
          {order.testQrs && order.testQrs.length > 0 && (
            <Card className="shadow-sm border-slate-200 no-print">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3 flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-4 w-4 text-blue-600" />Sample Labels ({order.testQrs.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />Print labels
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {order.testQrs.map((t, i) => (
                    <div key={`${t.testCode}-${i}`} className="border rounded-md p-3 text-center">
                      {t.qrBase64
                        // eslint-disable-next-line @next/next/no-img-element -- data: URL QR code; next/image adds nothing
                        ? <img src={t.qrBase64} alt={`QR ${t.display}`} className="w-24 h-24 mx-auto" />
                        : <div className="w-24 h-24 mx-auto flex items-center justify-center text-xs text-slate-400">No QR</div>}
                      <p className="text-xs font-medium mt-1">{t.display}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{t.testCode}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Print-only sheet of sample labels */}
          {order.testQrs && order.testQrs.length > 0 && (
            <div id="sample-labels" className="hidden">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: 16 }}>
                {order.testQrs.map((t, i) => (
                  <div key={`p-${t.testCode}-${i}`} style={{ border: "1px solid #000", padding: 8, width: 200, fontFamily: "sans-serif" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- data: URL QR code; next/image adds nothing */}
                    {t.qrBase64 && <img src={t.qrBase64} alt="" style={{ width: 96, height: 96 }} />}
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{t.display} ({t.testCode})</div>
                    <div style={{ fontSize: 11 }}>{patient?.name.full}</div>
                    <div style={{ fontSize: 10, color: "#333" }}>{patient?.phn ? `PHN ${patient.phn}` : patient?.mrn}</div>
                    <div style={{ fontSize: 9, color: "#666" }}>Order {order.id.slice(0, 8)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {results.map(result => (
                  <div key={result.id}>
                    <p className="text-xs text-slate-400 mb-2">Performed: {formatDate(result.performedAt)}</p>
                    <div className="bg-slate-50 rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Test</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Value</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Ref Range</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Flag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.results?.map((rr, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 text-slate-700">{rr.testName}</td>
                              <td className="px-3 py-2 font-medium">{rr.value} {rr.unit}</td>
                              <td className="px-3 py-2 text-slate-500">{rr.referenceRange || '—'}</td>
                              <td className="px-3 py-2">
                                {rr.flag && rr.flag !== 'normal' && (
                                  <Badge variant="outline" className={
                                    rr.flag === 'critical' ? 'text-red-700 border-red-200 bg-red-50' :
                                    rr.flag === 'high' ? 'text-amber-700 border-amber-200 bg-amber-50' :
                                    'text-blue-700 border-blue-200 bg-blue-50'
                                  }>{rr.flag.toUpperCase()}</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {result.conclusion && (
                      <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded p-3">{result.conclusion}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-blue-600" />Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { label: "Ordered", time: order.createdAt, done: true },
                  { label: "Sent to Lab", time: order.sentToLabAt, done: !!order.sentToLabAt },
                  { label: "Completed", time: null, done: order.status === 'completed' },
                ].map(step => (
                  <div key={step.label} className="flex items-start gap-3">
                    <div className={`h-3 w-3 rounded-full mt-1 shrink-0 ${step.done ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    <div>
                      <p className={`text-sm font-medium ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                      {step.time && <p className="text-xs text-slate-400">{formatDate(step.time)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {order.notesToLab && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                <CardTitle className="text-base">Notes to Lab</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-slate-600">{order.notesToLab}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
