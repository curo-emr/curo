"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@curo/web/ui/input-group";
import { ROUTES } from "@/lib/constants";

// Finds a patient in today's triage queue: submitting opens the queue filtered by ?q=.
export function QueueSearch() {
  const router = useRouter();
  const current = useSearchParams().get("q") ?? "";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(q ? `${ROUTES.TRIAGE_QUEUE}?q=${encodeURIComponent(q)}` : ROUTES.TRIAGE_QUEUE);
  };

  return (
    <form role="search" onSubmit={onSubmit} className="w-full max-w-md">
      <InputGroup className="bg-muted/50">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        {/* Keyed on the URL so "Clear" on the queue empties the box too. */}
        <InputGroupInput
          key={current}
          name="q"
          type="search"
          defaultValue={current}
          placeholder="Search today's queue"
          aria-label="Find a patient in today's queue by name or PHN"
        />
      </InputGroup>
    </form>
  );
}
