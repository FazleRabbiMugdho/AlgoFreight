import { useState, useEffect, useRef } from 'react';

interface Shortcut {
  keys: string;
  label: string;
  category: 'general' | 'dispatch' | 'navigate';
}

const SHORTCUTS: Shortcut[] = [
  { keys: 'Ctrl+K', label: 'Open Command Palette', category: 'general' },
  { keys: '?', label: 'Toggle this cheat sheet', category: 'general' },
  { keys: 'Ctrl+Alt+A', label: 'Open AI Cargo Intake', category: 'dispatch' },
  { keys: 'Ctrl+Alt+O', label: 'Run Optimization Solver', category: 'dispatch' },
  { keys: 'Ctrl+Alt+F', label: 'Navigate to Fleet View', category: 'navigate' },
  { keys: 'Ctrl+Alt+C', label: 'Navigate to Cargo List', category: 'navigate' },
  { keys: 'Ctrl+Alt+H', label: 'Navigate to Dispatch History', category: 'navigate' },
  { keys: 'Ctrl+Alt+Y', label: 'Navigate to Analytics', category: 'navigate' },
];

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  general: { label: 'General', icon: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' },
  dispatch: { label: 'Dispatch', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' },
  navigate: { label: 'Navigation', icon: 'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z' },
};

function KeyboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6v12m0 0l3.75-3.75M15.75 18l-3.75-3.75M3.75 6v12m0 0L7.5 14.25M3.75 18L0 14.25M20.25 6v12m0 0L24 14.25M20.25 18l3.75-3.75M6 9.75h.008v.008H6V9.75zm3 0h.008v.008H9V9.75zm3 0h.008v.008H12V9.75zm0 3h.008v.008H12V12.75zm-3 0h.008v.008H9V12.75zm-3 0h.008v.008H6V12.75zm9-3h.008v.008H15V9.75zm3 0h.008v.008H18V9.75zm-3 3h.008v.008H15V12.75zm3 0h.008v.008H18V12.75z" />
    </svg>
  );
}

function CategoryIcon({ d }: { d: string }) {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export function ShortcutCheatSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Toggle on ? key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          setIsOpen((prev) => !prev);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const categories = ['general', 'dispatch', 'navigate'] as const;

  return (
    <div ref={panelRef} className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm shadow-lg backdrop-blur transition-all duration-200 ${
          isOpen
            ? 'border-blue-200 bg-blue-50 text-blue-600 shadow-blue-900/10 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
            : 'border-slate-200/70 bg-white/80 text-slate-400 shadow-slate-900/10 hover:border-slate-300 hover:bg-white hover:text-slate-600 hover:shadow-xl dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800/95 dark:hover:text-slate-300'
        }`}
        title="Keyboard shortcuts"
      >
        ?
      </button>

      {/* Panel */}
      <div
        className={`absolute bottom-14 right-0 z-40 w-80 origin-bottom-right overflow-hidden rounded-2xl border shadow-xl transition-all duration-200 ${
          isOpen
            ? 'scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0'
        } border-slate-200 bg-white shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <KeyboardIcon />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Keyboard Shortcuts
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Press <kbd className="rounded border border-slate-300 bg-slate-100 px-1 text-[9px] dark:border-slate-600 dark:bg-slate-700">?</kbd> to toggle
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-80 overflow-y-auto overscroll-contain p-2">
          {categories.map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat);
            if (items.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded text-slate-400 dark:text-slate-500">
                    <CategoryIcon d={meta.icon} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {meta.label}
                  </span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                {items.map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <span className="text-sm text-slate-600 dark:text-slate-300">{s.label}</span>
                    <kbd className="ml-3 shrink-0 rounded-md border border-slate-200 bg-slate-50/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-400">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-2 text-center text-[10px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
          Shortcuts work globally from any page
        </div>
      </div>
    </div>
  );
}
