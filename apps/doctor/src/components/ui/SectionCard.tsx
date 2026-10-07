import { type LucideIcon } from "lucide-react";
import { Card } from "@curo/web/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  icon?: LucideIcon;
  iconClassName?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  count?: number;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
  id?: string;
}

// The standard content card: quiet header (icon, title, optional count) and a body.
export function SectionCard({
  icon: Icon, iconClassName, title, description, count, headerRight, children, noPadding, className, id,
}: SectionCardProps) {
  return (
    <Card id={id} className={cn("gap-0", className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {Icon && <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />}
            {title}
            {count !== undefined && count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground tabular-nums">{count}</span>
            )}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {headerRight}
      </div>
      <div className={noPadding ? "border-t" : "px-5 pb-5"}>{children}</div>
    </Card>
  );
}
