export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 bg-muted rounded-md" />
        <div className="h-5 w-64 bg-muted rounded-md" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border p-4 bg-muted">
            <div className="h-3 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border shadow-sm">
            <div className="p-4 border-b border-border bg-muted/50">
              <div className="h-6 w-48 bg-muted rounded" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="w-16 h-10 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 bg-muted rounded" />
                    <div className="h-4 w-64 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border shadow-sm p-6">
              <div className="h-6 w-36 bg-muted rounded mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
