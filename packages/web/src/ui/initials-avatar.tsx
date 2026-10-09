import { cn } from "cn";
import { getInitials } from "../format";

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-16 text-xl",
};

/** A person's initials in a tinted circle, for patients and staff who have no photo. */
export function InitialsAvatar({ name, size = "md", className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        SIZES[size],
        className,
      )}
    >
      {getInitials(name) || "?"}
    </div>
  );
}
