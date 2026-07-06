interface ShortcutBadgeProps {
  keys: string;
  className?: string;
}

export function ShortcutBadge({ keys, className = '' }: ShortcutBadgeProps) {
  return (
    <kbd className={`hidden rounded-md border border-slate-300 bg-slate-100/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm sm:inline-block dark:border-slate-600 dark:bg-slate-700/80 dark:text-slate-500 ${className}`}>
      {keys}
    </kbd>
  );
}
