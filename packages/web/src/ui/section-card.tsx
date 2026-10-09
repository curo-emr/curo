import { type LucideIcon } from "lucide-react";
import { Card } from "./card";
import { cn } from "cn";

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
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
            {Icon && (
              // The tile takes a tint of the icon's colour (bg-current), so any iconClassName colour works.
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground", iconClassName && [iconClassName, "bg-current/10"])}>
                <Icon className="size-4" />
              </span>
            )}
            {title}
            {count !== undefined && count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground tabular-nums">{count}</span>
            )}
          </h2>
          {description && <p className={cn("mt-0.5 text-xs text-muted-foreground", Icon && "pl-9.5")}>{description}</p>}
        </div>
        {headerRight}
      </div>
      <div className={noPadding ? "border-t" : "px-5 pb-5"}>{children}</div>
    </Card>
  );
}
