import { useEffect, useRef } from "react";

/**
 * Runs `callback` immediately and then every `intervalMs` while the tab is
 * visible. The latest callback is always used, so callers don't need to
 * memoise it.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number) {
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void latest.current();
    };
    void latest.current();
    const interval = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
}
