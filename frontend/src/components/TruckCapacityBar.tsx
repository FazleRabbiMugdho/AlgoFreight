interface TruckCapacityBarProps {
  assignedWeight: number;
  maxCapacity: number;
  label?: string;
  showLabel?: boolean;
}

export function TruckCapacityBar({ assignedWeight, maxCapacity, label, showLabel = true }: TruckCapacityBarProps) {
  const pct = maxCapacity > 0 ? Math.min((assignedWeight / maxCapacity) * 100, 100) : 0;

  let barColor: string;
  let textColor: string;
  if (pct > 95) {
    barColor = 'bg-amber-500 dark:bg-amber-400';
    textColor = 'text-amber-700 dark:text-amber-300';
  } else if (pct >= 71) {
    barColor = 'bg-emerald-500 dark:bg-emerald-400';
    textColor = 'text-emerald-700 dark:text-emerald-300';
  } else {
    barColor = 'bg-slate-400 dark:bg-slate-500';
    textColor = 'text-slate-600 dark:text-slate-400';
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className={textColor}>{label ?? `${Math.round(pct)}%`}</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {assignedWeight.toFixed(0)}kg / {maxCapacity.toFixed(0)}kg
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
