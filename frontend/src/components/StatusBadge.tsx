import type { CargoStatus } from '../types';

const statusColors: Record<CargoStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Delivered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

interface StatusBadgeProps {
  status: CargoStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
      {status}
    </span>
  );
}
