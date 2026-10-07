"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@curo/web/ui/input";
import { Button } from "@curo/web/ui/button";
import { scanCode } from "@/lib/api/lab";
import { apiErrorMessage } from "@curo/web/api";
import { ROUTES } from "@/lib/constants";

/**
 * Reads a scanned code; a barcode scanner types it and presses Enter.
 * - A patient's visit slip opens the visit's tests sent to this lab.
 * - A sample label receives that sample and opens its order. A sample meant
 *   for another lab is refused, and the message says which lab it is for.
 */
export function ScanBox() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qrData = code.trim();
    if (!qrData) return;
    setIsScanning(true);
    try {
      const result = await scanCode(qrData);
      setCode("");
      if (result.kind === "sample") {
        toast.success(`Sample received: ${result.testName}`);
        router.push(ROUTES.ORDER(result.order.id));
      } else if (result.orders.length) {
        router.push(ROUTES.VISIT_WORKLIST(result.orders[0].encounterId));
      } else {
        toast.info("None of this visit's tests were sent to your lab.");
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not read that code. Please try again."));
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
      <label htmlFor="scan-code" className="flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
        <ScanLine className="h-4 w-4 text-primary" /> Scan
      </label>
      <Input
        id="scan-code"
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Scan a patient's lab slip or a sample label"
        autoComplete="off"
        className="h-9 flex-1"
        disabled={isScanning}
      />
      <Button type="submit" size="sm" disabled={isScanning || !code.trim()}>
        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
      </Button>
    </form>
  );
}
