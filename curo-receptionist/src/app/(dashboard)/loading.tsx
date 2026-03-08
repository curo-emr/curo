export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 bg-slate-200 rounded-md" />
        <div className="h-5 w-64 bg-slate-100 rounded-md" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
            <div className="h-8 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="h-6 w-48 bg-slate-200 rounded" />
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="w-16 h-10 bg-slate-100 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 bg-slate-200 rounded" />
                    <div className="h-4 w-64 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="h-6 w-36 bg-slate-200 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
