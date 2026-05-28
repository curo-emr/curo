"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getTestName } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMyProfile, getMyLabOrders } from "@/lib/api/patient-portal";
import { getLabTestCatalog } from "@/lib/data/api";
import type { LabOrder, LabTestCatalogItem } from "@/types";

export default function LabReportsPage() {
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [labTestCatalog, setLabTestCatalog] = useState<LabTestCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyProfile().then(async pt => {
      if (!pt) { setIsLoading(false); return; }
      const [labs, catalog] = await Promise.all([getMyLabOrders(pt.id), getLabTestCatalog()]);
      setLabOrders(labs);
      setLabTestCatalog(catalog);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const doctors: never[] = [];

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
              <EmptyState message="No completed lab results yet." />
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
