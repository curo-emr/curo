import type { Status } from "@curo/web/ui/status-badge";
import type { LabOrder } from "@/types";

/**
 * The status an order's badge shows. The API keeps a received order at
 * `sent_to_lab` and records the receipt in `receivedAt`, so a received order
 * reads "Sample received", as it does in the doctor portal.
 */
export function orderStatus(order: Pick<LabOrder, "status" | "receivedAt">): Status {
  return order.status === "sent_to_lab" && order.receivedAt ? "sample_received" : order.status;
}
