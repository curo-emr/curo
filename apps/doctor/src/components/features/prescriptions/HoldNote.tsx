import { PauseCircle } from "lucide-react";
import type { Prescription } from "@/types";

/** Why the pharmacy is holding a prescription, under its directions; nothing unless it's on hold. */
export function HoldNote({ rx }: { rx: Prescription }) {
  if (rx.status !== "on_hold") return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-foreground">
      <PauseCircle className="mt-px size-3.5 shrink-0 text-muted-foreground" />
      <span>The pharmacy is holding this{rx.holdReason ? `: ${rx.holdReason}` : "."}</span>
    </p>
  );
}
