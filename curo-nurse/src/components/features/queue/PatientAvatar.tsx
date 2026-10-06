import { cn, initials } from "@/lib/utils";

export function PatientAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold select-none",
        className,
      )}
    >
      {initials(name) || "?"}
    </div>
  );
}
