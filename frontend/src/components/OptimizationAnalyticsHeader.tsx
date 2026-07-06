import type { DispatchRunResponse } from '../types';

interface OptimizationAnalyticsHeaderProps {
  totalCapacityKg: number;
  usedCapacityKg: number;
  pendingWeightKg: number;
  lastRuntimeMs: number | null;
  lastAlgorithmUsed: string | null;
}

function GaugeArc({ pct }: { pct: number }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(pct / 100, 1));
  const clamped = Math.min(pct, 100);

  let color: string;
  if (clamped >= 85) color = 'stroke-emerald-500 dark:stroke-emerald-400';
  else if (clamped >= 60) color = 'stroke-blue-500 dark:stroke-blue-400';
  else if (clamped >= 35) color = 'stroke-amber-500 dark:stroke-amber-400';
  else color = 'stroke-red-500 dark:stroke-red-400';

  return (
    <svg className="h-16 w-16 -rotate-90 shrink-0" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-200 dark:text-slate-700" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className={`${color} transition-all duration-700 ease-out`}
        style={{ strokeDashoffset: offset }}
      />
      <text x="32" y="32" textAnchor="middle" dominantBaseline="central" className="fill-slate-700 text-xs font-bold dark:fill-slate-200" style={{ transform: 'rotate(90deg) translateY(-2px)', transformOrigin: 'center' }}>
        {clamped.toFixed(0)}%
      </text>
    </svg>
  );
}

function RuntimeBadge({ ms, algo }: { ms: number | null; algo: string | null }) {
  const isFast = ms !== null && ms < 500;
  const displayMs = ms !== null ? ms.toFixed(1) : null;

  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        isFast
          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
      }`}>
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          {displayMs !== null ? (
            <>
              <span className={`text-lg font-bold tabular-nums ${isFast ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {displayMs}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">ms</span>
              {isFast && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Fast
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          {algo ?? 'No runs yet'}
        </p>
      </div>
    </div>
  );
}

export function OptimizationAnalyticsHeader({
  totalCapacityKg,
  usedCapacityKg,
  pendingWeightKg,
  lastRuntimeMs,
  lastAlgorithmUsed,
}: OptimizationAnalyticsHeaderProps) {
  const utilizationPct = totalCapacityKg > 0 ? (usedCapacityKg / totalCapacityKg) * 100 : 0;
  const wastedSaved = Math.max(0, totalCapacityKg - usedCapacityKg);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Fleet Capacity Utilization */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fleet Capacity Utilization
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {usedCapacityKg.toFixed(0)} kg / {totalCapacityKg.toFixed(0)} kg used
            </p>
          </div>
          <GaugeArc pct={utilizationPct} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              utilizationPct >= 85
                ? 'bg-emerald-500'
                : utilizationPct >= 60
                  ? 'bg-blue-500'
                  : utilizationPct >= 35
                    ? 'bg-amber-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(utilizationPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Wasted Volume Saved */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Wasted Volume Saved
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Capacity preserved by smart allocation
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-100">
          {wastedSaved.toFixed(0)}
          <span className="ml-1 text-sm font-normal text-slate-400 dark:text-slate-500">kg</span>
        </p>
        {pendingWeightKg > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {pendingWeightKg.toFixed(0)} kg still pending
          </p>
        )}
      </div>

      {/* Algorithmic Runtime */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Algorithmic Runtime
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Solver execution speed
            </p>
          </div>
          <RuntimeBadge ms={lastRuntimeMs} algo={lastAlgorithmUsed} />
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="inline-flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sub-500ms target
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>Real-time optimized</span>
        </div>
      </div>
    </div>
  );
}
