import { LabOrder, LabTestCatalogItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatStatus, getTestName } from "@/lib/utils";
import { Beaker, Activity } from "lucide-react";

interface LabsTabProps {
  labOrders: LabOrder[];
  labTestCatalog: LabTestCatalogItem[];
}

export function LabsTab({ labOrders, labTestCatalog }: LabsTabProps) {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Beaker className="h-5 w-5 text-status-purple-text" /> Lab Orders & Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {labOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No lab orders on record.</div>
          ) : (
            labOrders.map(lo => (
              <div key={lo.id} className="p-6 hover:bg-muted transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-foreground">Order {formatDate(lo.createdAt)}</span>
                      {lo.priority === 'urgent' && <Badge className="bg-status-error-bg text-status-error-text border-status-error-border">Urgent</Badge>}
                      <Badge variant="outline" className={
                        lo.status === 'results_pending' ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border' :
                        lo.status === 'sent_to_lab' ? 'bg-primary/10 text-primary border-primary/20' :
                        'bg-muted text-foreground'
                      }>
                        {formatStatus(lo.status)}
                      </Badge>
                    </div>
                    {lo.notesToLab && (
                      <p className="text-sm text-muted-foreground bg-white p-2 border rounded inline-block mb-3">
                        <span className="font-medium">Notes:</span> {lo.notesToLab}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {lo.tests.map(t => (
                        <Badge key={t.testId} variant="secondary" className="bg-white border text-foreground">
                          {getTestName(t.testId, labTestCatalog)} — {t.status.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {lo.status === 'results_pending' && !lo.review.isReviewed && (
                      <button className="text-sm px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary font-medium rounded-md border border-primary/20 transition-colors">
                        Review Results
                      </button>
                    )}
                    {lo.review.isReviewed && (
                      <span className="text-sm text-status-success-text flex items-center gap-1 bg-status-success-bg px-2 py-1 rounded border border-status-success-border">
                        <Activity className="h-3 w-3" /> Reviewed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
