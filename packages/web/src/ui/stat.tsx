import { Card } from "./card";
import { cn } from "./utils";

/** A row of headline numbers in one card: two across on a phone, four on a wide screen. */
export function StatStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cn("grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x", className)}>{children}</Card>;
}

export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {detail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
