import type { ManifestRecord } from '../types';
import { algorithmLabel } from '../pages/AnalyticsPage';

interface DispatchResultCardProps {
  manifest: ManifestRecord;
}

export function DispatchResultCard({ manifest }: DispatchResultCardProps) {
  return (
    <div className="animate-slide-in rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-emerald-700 dark:text-emerald-300">
          Truck {manifest.truckId.slice(0, 8)}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {new Date(manifest.runTimestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">
        {manifest.totalWeightKg.toFixed(0)}kg · {manifest.cargoCount ?? manifest.cargoIds?.length ?? 0} items
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {algorithmLabel(manifest.algorithmUsed)}
      </p>
    </div>
  );
}
