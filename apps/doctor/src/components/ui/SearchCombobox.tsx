"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@curo/web/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@curo/web/ui/popover";
import { cn } from "@/lib/utils";

interface SearchComboboxProps<T> {
  placeholder: string;
  /** Returns matches for a (non-empty) query. May be async (server search) or local filtering. */
  search: (query: string) => T[] | Promise<T[]>;
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  /** Offer "Add “query”" when nothing in the catalog fits. */
  onCustom?: (query: string) => void;
  /** Suggestions shown before the user types. */
  suggestions?: T[];
  className?: string;
}

// A search-as-you-type picker (shadcn Popover + Command). Picking an item clears the box so
// several items can be added in a row.
export function SearchCombobox<T>({
  placeholder, search, getKey, renderItem, onSelect, onCustom, suggestions = [], className,
}: SearchComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Results are tagged with the query they answer, so stale results never show for a newer query.
  const [results, setResults] = useState<{ q: string; items: T[] }>({ q: "", items: [] });
  const q = query.trim();
  const settled = results.q === q;

  useEffect(() => {
    if (!q) return;
    let active = true;
    const t = setTimeout(async () => {
      const items = await Promise.resolve(search(q)).catch(() => [] as T[]);
      if (active) setResults({ q, items });
    }, 150);
    return () => { active = false; clearTimeout(t); };
  }, [q, search]);

  const loading = !!q && !settled;
  const items = q ? (settled ? results.items : []) : suggestions;

  const pick = (item: T) => {
    onSelect(item);
    setQuery("");
    setOpen(false);
  };

  const pickCustom = () => {
    onCustom?.(q);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-ring/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            className,
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">{placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder={placeholder} />
          <CommandList className="max-h-72">
            {loading && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
              </div>
            )}
            {!loading && q && items.length === 0 && !onCustom && <CommandEmpty>No matches.</CommandEmpty>}
            {!q && items.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Start typing to search.</p>
            )}
            {items.length > 0 && (
              <CommandGroup>
                {items.map(item => (
                  <CommandItem key={getKey(item)} value={getKey(item)} onSelect={() => pick(item)}>
                    {renderItem(item)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {onCustom && q && !loading && (
              <CommandGroup>
                <CommandItem value={`__custom__${q}`} onSelect={pickCustom} className="text-muted-foreground">
                  <Plus />
                  <span>Add <span className="font-medium text-foreground">“{q}”</span></span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
