"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useDebouncedValue } from "../hooks";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { InitialsAvatar } from "../ui/initials-avatar";

/** One search result: who it is, and a line that tells them apart. */
export interface FinderHit {
  id: string;
  name: string;
  detail?: string;
}

interface QuickFindProps {
  /** What the finder does, e.g. "Find a patient". */
  label: string;
  /** What can be searched by, e.g. "Search by name, MRN, phone or NIC…". */
  placeholder: string;
  /** What the results are, plural, e.g. "Patients". */
  heading: string;
  /** Results are cached under this key, so a change that invalidates it refreshes them. */
  queryKey: readonly unknown[];
  search: (text: string) => Promise<FinderHit[]>;
  /** Where picking a result goes. */
  href: (id: string) => string;
}

const MAX_RESULTS = 8;

// A finder for the top bar, opened with ⌘K / Ctrl+K. Picking a result opens it.
export function QuickFind({ label, placeholder, heading, queryKey, search, href }: QuickFindProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // The search waits until typing pauses.
  const text = useDebouncedValue(query.trim(), 200);
  const found = useQuery({
    queryKey: [...queryKey, text],
    queryFn: () => search(text),
    enabled: !!text,
    placeholderData: keepPreviousData,
  });
  const results = found.data?.slice(0, MAX_RESULTS) ?? [];
  const loading = found.isFetching || text !== query.trim();
  const things = heading.toLowerCase();

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
        <span className="flex-1 text-left">{label}…</span>
        <kbd className="hidden h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <DialogDescription className="sr-only">{placeholder}</DialogDescription>
          <Command shouldFilter={false} className="**:data-[slot=command-input-wrapper]:h-12">
            <CommandInput value={query} onValueChange={setQuery} placeholder={placeholder} />
            <CommandList className="max-h-80">
              {!hasQuery && (
                <p className="py-8 text-center text-sm text-muted-foreground">Start typing to search {things}.</p>
              )}
              {hasQuery && loading && results.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Searching…
                </div>
              )}
              {hasQuery && !loading && found.isError && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Couldn&apos;t search {things}. Check your connection and try again.
                </p>
              )}
              {hasQuery && !loading && !found.isError && <CommandEmpty>No {things} found.</CommandEmpty>}
              {hasQuery && results.length > 0 && (
                <CommandGroup heading={heading}>
                  {results.map(hit => (
                    <CommandItem key={hit.id} value={hit.id} onSelect={() => go(hit.id)} className="gap-3 py-2.5">
                      <InitialsAvatar name={hit.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{hit.name}</p>
                        {hit.detail && <p className="truncate text-xs text-muted-foreground">{hit.detail}</p>}
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
