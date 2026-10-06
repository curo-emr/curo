export default function PatientChartLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Patient header skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex gap-6 items-start">
          <div className="h-20 w-20 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-3 flex-1">
            <div className="h-8 w-56 bg-slate-200 rounded" />
            <div className="flex gap-6">
              <div className="h-4 w-32 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="bg-white border-b border-slate-200 px-2 py-3 flex gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 w-20 bg-slate-200 rounded" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="h-5 w-36 bg-slate-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
