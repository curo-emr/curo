import { cn, getInitials } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-16 w-16 text-xl",
};

export function PatientAvatar({ name, size = "md", className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "shrink-0 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center select-none",
        SIZES[size],
        className,
      )}
    >
      {getInitials(name) || "?"}
    </div>
  );
}
