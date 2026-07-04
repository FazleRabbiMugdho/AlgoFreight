import type { Truck } from '../types';
import { TruckCapacityBar } from './TruckCapacityBar';
import { SkeletonTable } from './SkeletonLoaders';

interface TruckTableProps {
  trucks: Truck[];
  isLoading: boolean;
  cargoAssignments?: Record<string, number>;
  onEdit?: (truck: Truck) => void;
  onDelete?: (id: string) => void;
}

export function TruckTable({ trucks, isLoading, cargoAssignments = {}, onEdit, onDelete }: TruckTableProps) {
  if (isLoading) return <SkeletonTable rows={4} cols={5} />;

  if (trucks.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No trucks registered yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Plate</th>
            <th className="px-4 py-3">Route</th>
            <th className="px-4 py-3">Capacity</th>
            <th className="px-4 py-3">Status</th>
            {(onEdit || onDelete) && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {trucks.map((t) => (
            <tr key={t.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{t.plateNumber}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.route}</td>
              <td className="px-4 py-3">
                <TruckCapacityBar
                  assignedWeight={cargoAssignments[t.id] ?? 0}
                  maxCapacity={t.maxCapacityKg}
                  showLabel={false}
                />
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.isAvailable
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {t.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </td>
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button onClick={() => onEdit(t)} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(t.id)} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
