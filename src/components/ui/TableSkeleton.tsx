interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 6 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse" aria-label="Loading emails" role="status">
      <span className="sr-only">Loading emails...</span>
      <div className="grid grid-cols-4 gap-4 border-b border-slate-100 pb-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-3 rounded bg-slate-100" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_value, index) => (
          <div key={index} className="grid grid-cols-4 items-center gap-4 py-5">
            <div className="h-4 w-4/5 rounded bg-slate-100" />
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-4 w-5/6 rounded bg-slate-100" />
            <div className="h-6 w-20 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
