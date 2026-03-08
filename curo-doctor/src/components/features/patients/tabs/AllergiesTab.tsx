import { Allergy } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface AllergiesTabProps {
  allergies: Allergy[];
}

export function AllergiesTab({ allergies }: AllergiesTabProps) {
  return (
    <Card className="shadow-sm border">
      <CardContent className="p-0">
        <div className="divide-y">
          {allergies.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No allergies recorded.</div>
          ) : (
            allergies.map(a => (
              <div key={a.id} className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-status-error-text shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{a.substance}</h4>
                      <Badge variant="outline" className={
                        a.severity === 'severe' ? 'text-status-error-text border-status-error-border bg-status-error-bg' :
                        a.severity === 'moderate' ? 'text-status-warning-text border-status-warning-border bg-status-warning-bg' :
                        'text-primary border-primary/20 bg-primary/10'
                      }>
                        {a.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Reaction: <span className="font-medium">{a.reaction}</span> • Recorded: {formatDate(a.recordedAt)}</p>
                    {a.notes && <p className="text-sm text-muted-foreground bg-muted p-2 rounded border">{a.notes}</p>}
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
