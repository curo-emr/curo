import type { StockItem } from "@/lib/api/pharmacy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { formatStatus } from "@/lib/utils";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface LowStockAlertsProps {
  medications: StockItem[];
}

export function LowStockAlerts({ medications }: LowStockAlertsProps) {
  const lowStock = medications
    .filter(m => m.quantity <= m.reorderThreshold && m.isActive !== false)
    .sort((a, b) => (a.quantity / a.reorderThreshold) - (b.quantity / b.reorderThreshold));

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {lowStock.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">All stock levels are adequate.</div>
        ) : (
          <div className="divide-y">
            {lowStock.map(med => {
              const ratio = med.quantity / med.reorderThreshold;
              const isOutOfStock = med.quantity === 0;
              return (
                <div key={med.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{med.genericName || med.medicationName}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      isOutOfStock ? 'bg-status-error-bg text-status-error-text' :
                      ratio <= 0.5 ? 'bg-status-error-bg text-status-error-text' :
                      'bg-status-warning-bg text-status-warning-text'
                    }`}>
                      {isOutOfStock ? 'Out of Stock' : `${med.quantity} left`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[med.brandName, med.strength, med.form && formatStatus(med.form), `Reorder at ${med.reorderThreshold}`]
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
