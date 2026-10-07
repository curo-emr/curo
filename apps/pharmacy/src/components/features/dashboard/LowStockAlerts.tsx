import type { GroupedStock } from "@/lib/api/pharmacy";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { AlertTriangle } from "lucide-react";
import { formatStatus } from "@curo/web/format";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface LowStockAlertsProps {
  /** Drugs at or below their reorder level, as GET /stock/alerts returns them. */
  drugs: GroupedStock[];
}

/** How much of its reorder level a drug has left; lowest first is most urgent. */
const share = (d: GroupedStock) => (d.reorderLevel ? d.usableQuantity / d.reorderLevel : 0);

export function LowStockAlerts({ drugs }: LowStockAlertsProps) {
  const byUrgency = [...drugs].sort((a, b) => share(a) - share(b));

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {byUrgency.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">All stock levels are adequate.</div>
        ) : (
          <div className="divide-y">
            {byUrgency.map(drug => {
              const isOutOfStock = drug.usableQuantity <= 0;
              return (
                <div key={drug.medicationCode} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{drug.genericName || drug.medicationName}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      isOutOfStock || share(drug) <= 0.5
                        ? 'bg-status-error-bg text-status-error-text'
                        : 'bg-status-warning-bg text-status-warning-text'
                    }`}>
                      {isOutOfStock ? 'Out of Stock' : `${drug.usableQuantity} left`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[drug.strength, drug.form && formatStatus(drug.form), `Reorder at ${drug.reorderLevel}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              );
            })}
            <Link href={ROUTES.INVENTORY} className="block px-4 py-2 text-center text-xs text-primary hover:bg-muted transition-colors">
              View all inventory →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
