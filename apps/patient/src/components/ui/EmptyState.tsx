import { type LucideIcon, Inbox } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, message, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  // Simple inline empty state
  if (message && !title && !Icon) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        {message}
      </div>
    );
  }

  const DisplayIcon = Icon || Inbox;

  return (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <div className="bg-muted p-4 rounded-full mb-4">
        <DisplayIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium text-foreground">{title || message}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-4">
          <Button variant="outline" size="sm">{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
