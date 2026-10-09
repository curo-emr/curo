"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useDebouncedValue } from "../hooks";
import { formatAgeSex } from "../format";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { InitialsAvatar } from "../ui/initials-avatar";

/** What a search result needs to show. */
export interface PatientHit {
  id: string;
  name: { full: string };
  dob?: string | null;
  sex?: string | null;
  mrn?: string | null;
  phone?: string | null;
}

interface PatientSearchProps {
  /** Patients matching a name, MRN, phone or NIC. */
  search: (text: string) => Promise<PatientHit[]>;
  /** Where picking a patient goes, e.g. their chart. */
  href: (patientId: string) => string;
}

const MAX_RESULTS = 8;

// Global patient finder (⌘K / Ctrl+K) for the top bar. Picking a result opens that patient.
export function PatientSearch({ search, href }: PatientSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // The search waits until typing pauses.
  const text = useDebouncedValue(query.trim(), 200);
  const found = useQuery({
    // Under "patients", so registering or editing one refreshes the results.
    queryKey: ["patients", "find", text],
    queryFn: () => search(text),
    enabled: !!text,
    placeholderData: keepPreviousData,
  });
  const results = found.data?.slice(0, MAX_RESULTS) ?? [];
  const loading = found.isFetching || text !== query.trim();

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

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };

  const go = (id: string) => {
    onOpenChange(false);
    router.push(href(id));
  };

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Find a patient…</span>
        <kbd className="hidden h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
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
                  <Loader2 className="mr-2 size-4 animate-spin" /> Searching…
                </div>
              )}
              {hasQuery && !loading && found.isError && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Couldn&apos;t search patients. Check your connection and try again.
                </p>
              )}
              {hasQuery && !loading && !found.isError && <CommandEmpty>No patients found.</CommandEmpty>}
              {hasQuery && results.length > 0 && (
                <CommandGroup heading="Patients">
                  {results.map(p => (
                    <CommandItem key={p.id} value={p.id} onSelect={() => go(p.id)} className="gap-3 py-2.5">
                      <InitialsAvatar name={p.name.full} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{p.name.full}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[formatAgeSex(p.dob, p.sex), p.mrn, p.phone].filter(Boolean).join(" · ")}
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
