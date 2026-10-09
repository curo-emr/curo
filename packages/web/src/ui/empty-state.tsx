import { type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// "Nothing here yet" for a list or card, sized to sit inside a card. Built on shadcn's Empty.
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Empty className={cn("gap-3 px-4 py-10", className)}>
      <EmptyHeader className="gap-1">
        {Icon && (
          <EmptyMedia variant="icon" className="mb-2 size-10 rounded-full text-muted-foreground">
            <Icon className="size-5" />
          </EmptyMedia>
        )}
        <EmptyTitle className="text-sm">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
