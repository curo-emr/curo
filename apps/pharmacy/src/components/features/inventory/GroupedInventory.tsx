"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, AlertTriangle, PackageX } from "lucide-react";
import { Card, CardContent } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { Input } from "@curo/web/ui/input";
import type { GroupedStock } from "@/lib/api/pharmacy";

function expiryStatus(date: string): "expired" | "soon" | "ok" {
  if (!date) return "ok";
  const d = new Date(date).getTime();
  const now = Date.now();
  if (d < now) return "expired";
  if (d < now + 90 * 24 * 3600 * 1000) return "soon"; // within 90 days
  return "ok";
}

function fmtDate(date: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function GroupedInventory({ groups }: { groups: GroupedStock[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter(
      (g) => g.medicationName.toLowerCase().includes(q) || (g.genericName ?? "").toLowerCase().includes(q),
    );
  }, [groups, query]);

  const toggle = (code: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search medication..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 bg-muted border" />
      </div>

      <div className="space-y-2">
        {filtered.map((g) => {
          const isOpen = open.has(g.medicationCode);
          const anyExpiringSoon = g.batches.some((b) => expiryStatus(b.expiryDate) !== "ok");
          return (
            <Card key={g.medicationCode} className="shadow-sm border">
              <CardContent className="p-0">
                <button
                  onClick={() => toggle(g.medicationCode)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-slate-900">{g.medicationName}</p>
                      <p className="text-xs text-muted-foreground">{g.genericName} · {g.strength} · {g.batches.length} batch{g.batches.length !== 1 ? "es" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {anyExpiringSoon && <AlertTriangle className="h-4 w-4 text-status-warning-text" />}
                    {g.low && <Badge variant="outline" className="bg-status-error-bg text-status-error-text border-status-error-border">Low</Badge>}
                    <span className="text-sm font-semibold text-slate-700">{g.usableQuantity} {g.unit}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="text-left">
                          <th className="py-1 font-medium">Batch</th>
                          <th className="py-1 font-medium">Qty</th>
                          <th className="py-1 font-medium">Expiry</th>
                          <th className="py-1 font-medium">Supplier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.batches.map((b) => {
                          const st = expiryStatus(b.expiryDate);
                          return (
                            <tr key={b.id} className="border-t border-border/50">
                              <td className="py-1.5 font-mono text-xs">{b.batchNumber ?? "—"}</td>
                              <td className="py-1.5">{b.quantity}</td>
                              <td className="py-1.5">
                                <span className={
                                  st === "expired" ? "text-status-error-text font-medium"
                                    : st === "soon" ? "text-status-warning-text font-medium"
                                      : "text-muted-foreground"
                                }>
                                  {st === "expired" && <PackageX className="inline h-3 w-3 mr-1" />}
                                  {fmtDate(b.expiryDate)}
                                  {st === "expired" ? " (expired)" : st === "soon" ? " (soon)" : ""}
                                </span>
                              </td>
                              <td className="py-1.5 text-muted-foreground">{b.supplier ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-2">Dispensing draws from the earliest-expiring batch first (FEFO).</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No medications found.</p>}
      </div>
    </div>
  );
}
