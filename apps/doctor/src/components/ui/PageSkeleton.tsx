import { Skeleton } from "@curo/web/ui/skeleton";

// Generic loading placeholder: page header + a main column and a side column of cards.
export function PageSkeleton({ side = true }: { side?: boolean }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className={side ? "grid gap-6 lg:grid-cols-3" : "space-y-6"}>
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        {side && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}
