import { CloudOff, RotateCw } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

interface LoadErrorProps {
  /** What couldn't be loaded, as in "Couldn't load visits". */
  what: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** In place of a list or section whose data couldn't be loaded, so a failure never looks like "none". */
export function LoadError({ what, onRetry, retrying, className }: LoadErrorProps) {
  return (
    <EmptyState
      icon={CloudOff}
      title={`Couldn't load ${what}`}
      description="Check your connection and try again."
      className={className}
      action={onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
          <RotateCw className={retrying ? "animate-spin" : undefined} /> Try again
        </Button>
      )}
    />
  );
}
