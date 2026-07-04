import type { Cargo, Priority } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { SkeletonTable } from './SkeletonLoaders';

interface CargoTableProps {
  cargoes: Cargo[];
  isLoading: boolean;
  onEdit?: (cargo: Cargo) => void;
  onDelete?: (id: string) => void;
}

export function CargoTable({ cargoes, isLoading, onEdit, onDelete }: CargoTableProps) {
  if (isLoading) return <SkeletonTable rows={6} cols={6} />;

  if (cargoes.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No cargo records yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Weight</th>
            <th className="px-4 py-3">Destination</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            {(onEdit || onDelete) && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {cargoes.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{c.description}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.weightKg.toFixed(0)} kg</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.destination}</td>
              <td className="px-4 py-3"><PriorityBadge priority={c.priority as Priority} /></td>
              <td className="px-4 py-3"><StatusBadge status={c.status as 'Pending' | 'Assigned' | 'Delivered'} /></td>
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button onClick={() => onEdit(c)} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        Edit
                      </button>
                    )}
                    {onDelete && c.status === 'Pending' && (
                      <button onClick={() => onDelete(c.id)} className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
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
