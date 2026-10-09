"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { MyRecord } from "@/components/features/MyRecord";
import { useDoctors } from "@/lib/hooks/useDoctors";
import { directoryQueries, myQueries } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { formatDate, getTestName, getDoctorName } from "@/lib/utils";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { PageHeader } from "@curo/web/ui/page-header";
import { EmptyState } from "@curo/web/ui/empty-state";
import type { Doctor } from "@/lib/api/patient-portal";
import type { LabOrder, LabTestCatalogItem } from "@/types";

export default function LabReportsPage() {
  return <MyRecord>{patient => <LabReports patientId={patient.id} />}</MyRecord>;
}

function LabReports({ patientId }: { patientId: string }) {
  const doctors = useDoctors();
  const reports = allOf(useQuery(myQueries.labOrders(patientId)), useQuery(directoryQueries.labTests()));

  return (
    <QueryContent query={reports} what="your lab reports">
      {([labOrders, labTestCatalog]) => <LabReportList labOrders={labOrders} labTestCatalog={labTestCatalog} doctors={doctors} />}
    </QueryContent>
  );
}

interface LabReportListProps {
  labOrders: LabOrder[];
  labTestCatalog: LabTestCatalogItem[];
  doctors: Doctor[];
}

function LabReportList({ labOrders, labTestCatalog, doctors }: LabReportListProps) {
  const completedLabs = labOrders.filter(l => l.status === "completed");
  const pendingLabs = labOrders.filter(l => l.status !== "completed");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Lab Reports"
        description="View your lab test results and pending orders."
      />

      {/* Pending Labs */}
      {pendingLabs.length > 0 && (
        <Card className="shadow-sm border-status-warning-border">
          <CardHeader className="bg-status-warning-bg/50 border-b border-status-warning-border">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-lg text-status-warning-text">
                <Clock className="h-5 w-5 text-status-warning-text" />
                Pending Results
              </CardTitle>
              <Badge variant="secondary" className="bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg">
                {pendingLabs.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-status-warning-border">
              {pendingLabs.map(lab => (
                <div key={lab.id} className="p-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Ordered by {getDoctorName(lab.doctorId, doctors)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ordered: {formatDate(lab.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={lab.status} />
                      {lab.priority !== "routine" && (
                        <Badge className="bg-status-error-bg text-status-error-text border-status-error-border text-[10px] uppercase">
                          {lab.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {lab.tests.map(test => (
                      <div key={test.testId} className="flex items-center justify-between p-2 rounded-md bg-status-warning-bg/50">
                        <span className="text-sm text-foreground">{getTestName(test.testId, labTestCatalog)}</span>
                        <span className="text-xs text-status-warning-text font-medium">Awaiting results</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Labs */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-status-success-text" />
              Completed Results
            </CardTitle>
            <Badge variant="secondary" className="bg-status-success-bg text-status-success-text hover:bg-status-success-bg">
              {completedLabs.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {completedLabs.length === 0 ? (
              <EmptyState title="No completed lab results yet." />
            ) : (
              completedLabs.map(lab => (
                <div key={lab.id} className="p-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Ordered by {getDoctorName(lab.doctorId, doctors)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(lab.createdAt)}
                        {lab.review.reviewedAt && ` — Reviewed: ${formatDate(lab.review.reviewedAt)}`}
                      </p>
                    </div>
                    <StatusBadge status={lab.status} />
                  </div>
                  <div className="space-y-2">
                    {lab.tests.map(test => (
                      <div key={test.testId} className="flex items-center justify-between p-3 rounded-md bg-muted">
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            {getTestName(test.testId, labTestCatalog)}
                          </span>
                        </div>
                        <div className="text-right">
                          {test.result ? (
                            <span className="text-sm font-semibold text-foreground">{test.result}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No result</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
