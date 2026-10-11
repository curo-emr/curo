import { useState } from "react";
import { toast } from "sonner";

/** Opens files one at a time: `opening` names the one on its way, and a failure says so. */
export function useOpener() {
  const [opening, setOpening] = useState<string | null>(null);

  async function open(key: string, action: () => void | Promise<void>) {
    setOpening(key);
    try {
      await action();
    } catch {
      toast.error("Couldn't open the file. Try again.");
    } finally {
      setOpening(null);
    }
  }

  return { opening, open };
}
