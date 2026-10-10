import type { Status, Tone } from "@curo/web/ui/status-badge";
import { ROUTES } from "@/lib/constants";
import type { LabOrder } from "@/types";

/** The short number an order goes by on screen and on its labels: the start of its id. */
export const orderNumber = (order: Pick<LabOrder, "id">) => order.id.slice(0, 8).toUpperCase();

/**
 * The status an order's badge shows. The API keeps a received order at
 * `sent_to_lab` and records the receipt in `receivedAt`, so a received order
 * reads "Sample received", as it does in the doctor portal.
 */
export function orderStatus(order: Pick<LabOrder, "status" | "receivedAt">): Status {
  return order.status === "sent_to_lab" && order.receivedAt ? "sample_received" : order.status;
}

/**
 * What the lab does next with an order: receive its sample, then enter its
 * results. Null when there's nothing to do: the results are in, or the doctor
 * hasn't sent the order (or took it back).
 */
export function nextStep(order: Pick<LabOrder, "status" | "receivedAt">): "receive" | "results" | null {
  if (order.status !== "sent_to_lab") return null;
  return order.receivedAt ? "results" : "receive";
}

/** Each next step as a button: its label and the page that does it. */
export const STEP_ACTION = {
  receive: { label: "Receive sample", href: ROUTES.ORDER },
  results: { label: "Enter results", href: ROUTES.ORDER_RESULTS },
} as const;

export const PRIORITY_META: Record<LabOrder["priority"], { label: string; tone: Tone }> = {
  stat: { label: "STAT", tone: "error" },
  urgent: { label: "Urgent", tone: "warning" },
  routine: { label: "Routine", tone: "neutral" },
};
