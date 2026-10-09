import { Stethoscope } from "lucide-react";
import { cn } from "cn";

// The CuroMD logo: a stethoscope on a primary-coloured tile.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-sm",
        className,
      )}
    >
      <Stethoscope className="size-4" />
    </span>
  );
}
