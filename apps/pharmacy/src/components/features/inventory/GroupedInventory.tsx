"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Package, SearchX } from "lucide-react";
import { formatStatus } from "@curo/web/format";
import { EmptyState } from "@curo/web/ui/empty-state";
import { SearchInput } from "@curo/web/ui/search-input";
import { StatusBadge } from "@curo/web/ui/status-badge";
import type { GroupedStock } from "@/lib/api/pharmacy";
import { expiryState, stockLevel, type ExpiryState } from "@/lib/stock";
import { cn, formatDate } from "@/lib/utils";

const EXPIRY_TEXT: Record<ExpiryState, string> = {
  expired: "font-medium text-status-error-text",
  expiring: "font-medium text-status-warning-text",
  ok: "text-muted-foreground",
};

const EXPIRY_NOTE: Record<ExpiryState, string> = { expired: " · expired", expiring: " · soon", ok: "" };

// Every drug the pharmacy stocks, with its batches (earliest expiry first) one click away.
export function GroupedInventory({ groups }: { groups: GroupedStock[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter(g => [g.medicationName, g.genericName].some(text => text?.toLowerCase().includes(q)));
  }, [groups, query]);

  const toggle = (code: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (!next.delete(code)) next.add(code);
      return next;
    });

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <EmptyState icon={Package} title="No stock recorded" description="This pharmacy has no stock on its books yet. Record a delivery with Receive stock." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by medicine…" className="max-w-md" />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="No medicines match your search" />
        ) : (
          <ul className="divide-y">
            {filtered.map(g => {
              const isOpen = open.has(g.medicationCode);
              const expiries = g.batches.filter(b => b.quantity > 0).map(b => expiryState(b.expiryDate));
              const attention = expiries.includes("expired") ? "expired" : expiries.includes("expiring") ? "expiring" : null;
              return (
                <li key={g.medicationCode}>
                  <button
                    type="button"
                    onClick={() => toggle(g.medicationCode)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                  >
                    <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{g.medicationName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[g.form && formatStatus(g.form), `${g.batches.length} batch${g.batches.length === 1 ? "" : "es"}`, `reorder at ${g.reorderLevel}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {attention && (
                      <span className={cn("hidden text-xs sm:inline", EXPIRY_TEXT[attention])}>
                        {attention === "expired" ? "Expired batch" : "Batch expiring"}
                      </span>
                    )}
                    <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-sm font-semibold tabular-nums text-foreground">{g.usableQuantity} {g.unit}</span>
                      <StatusBadge status={stockLevel(g)} />
                    </span>
                  </button>

                  {isOpen && <Batches drug={g} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Batches({ drug }: { drug: GroupedStock }) {
  return (
    <div className="border-t bg-muted/30 px-4 py-3 sm:pl-11">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="text-left">
              <th className="py-1 pr-4 font-medium">Batch</th>
              <th className="py-1 pr-4 font-medium">Quantity</th>
              <th className="py-1 pr-4 font-medium">Expires</th>
              <th className="py-1 font-medium">Supplier</th>
            </tr>
          </thead>
          <tbody>
            {drug.batches.map(b => {
              const state = expiryState(b.expiryDate);
              return (
                <tr key={b.id} className="border-t border-border/50">
                  <td className="py-1.5 pr-4 font-mono text-xs">{b.batchNumber ?? "—"}</td>
                  <td className="py-1.5 pr-4 tabular-nums">{b.quantity}</td>
                  <td className={cn("whitespace-nowrap py-1.5 pr-4", EXPIRY_TEXT[state])}>
                    {b.expiryDate ? formatDate(b.expiryDate) : "—"}{EXPIRY_NOTE[state]}
                  </td>
                  <td className="py-1.5 text-muted-foreground">{b.supplier ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Dispensing takes from the batch that expires first.</p>
    </div>
  );
}
