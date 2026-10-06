"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PatientAvatar } from "@/components/ui/PatientAvatar";
import { getPatients } from "@/lib/api/patients";
import { ROUTES } from "@/lib/constants";
import { formatAgeSex } from "@/lib/utils";
import type { Patient } from "@/types";

// Global patient finder (⌘K / Ctrl+K). Picking a result opens the chart directly.
export function PatientSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let active = true;
    const t = setTimeout(() => {
      setLoading(true);
      getPatients(q)
        .then(r => { if (active) setResults(r.slice(0, 8)); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) { setQuery(""); setResults([]); }
  };

  const go = (id: string) => {
    onOpenChange(false);
    router.push(ROUTES.PATIENT(id));
  };

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Find a patient…</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg top-[20%] translate-y-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Find a patient</DialogTitle>
          <DialogDescription className="sr-only">Search by name, MRN, phone or NIC</DialogDescription>
          <Command shouldFilter={false} className="**:data-[slot=command-input-wrapper]:h-12">
            <CommandInput value={query} onValueChange={setQuery} placeholder="Search by name, MRN, phone or NIC…" />
            <CommandList className="max-h-80">
              {!hasQuery && (
                <p className="py-8 text-center text-sm text-muted-foreground">Start typing to search patients.</p>
              )}
              {hasQuery && loading && results.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
                </div>
              )}
              {hasQuery && !loading && <CommandEmpty>No patients found.</CommandEmpty>}
              {hasQuery && results.length > 0 && (
                <CommandGroup heading="Patients">
                  {results.map(p => (
                    <CommandItem key={p.id} value={p.id} onSelect={() => go(p.id)} className="gap-3 py-2.5">
                      <PatientAvatar name={p.name.full} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{p.name.full}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatAgeSex(p.dob, p.sex)} · {p.mrn}{p.phone ? ` · ${p.phone}` : ""}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
