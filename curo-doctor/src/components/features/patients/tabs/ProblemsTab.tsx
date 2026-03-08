import { Problem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface ProblemsTabProps {
  problems: Problem[];
}

export function ProblemsTab({ problems }: ProblemsTabProps) {
  return (
    <Card className="shadow-sm border">
      <CardContent className="p-0">
        <div className="divide-y">
          {problems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No problems recorded.</div>
          ) : (
            problems.map(p => (
              <div key={p.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{p.name}</h4>
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className={p.status === 'active' ? 'bg-primary/15 text-primary' : ''}>
                        {p.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">ICD-10: <span className="font-mono text-foreground">{p.icdCode}</span> • Onset: {formatDate(p.onsetDate)}</p>
                    {p.notes && <p className="text-sm text-muted-foreground bg-muted p-2 rounded border">{p.notes}</p>}
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
