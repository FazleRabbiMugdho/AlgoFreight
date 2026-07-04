export function SkeletonCargoCard() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="mb-2 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mb-3 h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export function SkeletonTruckCard() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mb-2 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-slate-100 py-3 dark:border-slate-700">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonManifestCard() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mb-1 h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export function SkeletonBarChart() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-8 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-6 flex-1 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${70 + (i * 5) % 30}%` }} />
        </div>
      ))}
    </div>
  );
}
