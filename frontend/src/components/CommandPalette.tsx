import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface CommandAction {
  id: string;
  label: string;
  description: string;
  shortcut: string;
  icon: string;
  category: 'dispatch' | 'navigate';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenIntake: () => void;
  onRunOptimize: () => void;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: { match: boolean; text: string }[] = [];
  let idx = 0;
  while (idx < text.length) {
    const matchIdx = lower.indexOf(q, idx);
    if (matchIdx === -1) {
      parts.push({ match: false, text: text.slice(idx) });
      break;
    }
    if (matchIdx > idx) parts.push({ match: false, text: text.slice(idx, matchIdx) });
    parts.push({ match: true, text: text.slice(matchIdx, matchIdx + q.length) });
    idx = matchIdx + q.length;
  }
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark key={i} className="rounded-sm bg-yellow-200/70 px-0.5 text-inherit dark:bg-yellow-500/30">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  dispatch: 'Dispatch',
  navigate: 'Navigation',
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ActionIcon({ icon, className }: { icon: string; className?: string }): ReactNode {
  const icons: Record<string, ReactNode> = {
    parse: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    optimize: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    fleet: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    cargo: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    history: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    analytics: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  };
  return icons[icon] ?? null;
}

export function CommandPalette({ isOpen, onClose, onOpenIntake, onRunOptimize }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions: CommandAction[] = [
    { id: 'parse', label: 'AI Cargo Intake', description: 'Parse a natural-language cargo description', shortcut: 'Ctrl+Alt+A', icon: 'parse', category: 'dispatch', action: () => { onClose(); onOpenIntake(); } },
    { id: 'optimize', label: 'Run Optimization Solver', description: 'Dispatch cargo using Greedy / Knapsack', shortcut: 'Ctrl+Alt+O', icon: 'optimize', category: 'dispatch', action: () => { onClose(); onRunOptimize(); } },
    { id: 'fleet', label: 'Fleet View', description: 'View trucks and available capacity', shortcut: 'Ctrl+Alt+F', icon: 'fleet', category: 'navigate', action: () => { onClose(); navigate('/trucks'); } },
    { id: 'cargo', label: 'Cargo List', description: 'View all cargo items', shortcut: 'Ctrl+Alt+C', icon: 'cargo', category: 'navigate', action: () => { onClose(); navigate('/cargo'); } },
    { id: 'history', label: 'Dispatch History', description: 'View past dispatch runs', shortcut: 'Ctrl+Alt+H', icon: 'history', category: 'navigate', action: () => { onClose(); navigate('/history'); } },
    { id: 'analytics', label: 'Analytics Dashboard', description: 'View fleet analytics', shortcut: 'Ctrl+Alt+Y', icon: 'analytics', category: 'navigate', action: () => { onClose(); navigate('/analytics'); } },
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? actions.filter(
        (a) => a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
      )
    : actions;

  // Group filtered by category preserving order
  const grouped = filtered.reduce<Record<string, CommandAction[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});
  const flatIndex = filtered.reduce<{ action: CommandAction; groupIdx: number }[]>((acc, a, i) => {
    acc.push({ action: a, groupIdx: i });
    return acc;
  }, []);

  // Reset selection on filter change
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Open/close animation toggle
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const executeSelected = useCallback(() => {
    if (filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  }, [filtered, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || !isOpen) return;
    const selected = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); executeSelected(); return; }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex, executeSelected]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm pt-[12vh]"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl origin-top transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 dark:border-slate-700/60 dark:bg-slate-800 dark:shadow-black/30 dark:ring-slate-100/5">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-700/60">
            <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands and pages…"
              className="flex-1 bg-transparent text-[15px] text-slate-800 placeholder-slate-400 outline-none dark:text-slate-200 dark:placeholder-slate-500"
            />
            <kbd className="hidden shrink-0 rounded-md border border-slate-300 bg-slate-100/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 sm:inline-block dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/60">
                  <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No results for "<span className="text-slate-700 dark:text-slate-300">{query}"</span>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Try a different search term
                </p>
              </div>
            ) : (
              ['dispatch', 'navigate'].map((cat) => {
                const items = grouped[cat];
                if (!items || items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 px-5 pt-3 pb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700/60" />
                      <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                        {items.length}
                      </span>
                    </div>
                    {items.map((action) => {
                      const idx = filtered.indexOf(action);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={action.id}
                          data-selected={isSelected}
                          onClick={action.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`group relative flex w-full items-center gap-3.5 px-5 py-2.5 text-left transition-all duration-150 ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/25'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                          }`}
                        >
                          {/* Active indicator bar */}
                          <div
                            className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full transition-all duration-150 ${
                              isSelected ? 'bg-blue-500 opacity-100' : 'opacity-0'
                            }`}
                          />
                          {/* Icon */}
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 ${
                              isSelected
                                ? 'border-blue-200 bg-blue-100 text-blue-600 dark:border-blue-700/50 dark:bg-blue-900/40 dark:text-blue-400'
                                : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:group-hover:border-slate-600 dark:group-hover:bg-slate-700/50'
                            }`}
                          >
                            <ActionIcon icon={action.icon} className="h-4 w-4" />
                          </div>
                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              <HighlightText text={action.label} query={query} />
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              <HighlightText text={action.description} query={query} />
                            </p>
                          </div>
                          {/* Shortcut badge */}
                          <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-flex dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-500">
                            {action.shortcut}
                          </kbd>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-2.5 dark:border-slate-700/60">
            <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-medium dark:border-slate-600 dark:bg-slate-700/50">↑</kbd>
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-medium dark:border-slate-600 dark:bg-slate-700/50">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-medium dark:border-slate-600 dark:bg-slate-700/50">↵</kbd>
                select
              </span>
              <span className="hidden items-center gap-1 sm:flex">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-medium dark:border-slate-600 dark:bg-slate-700/50">esc</kbd>
                close
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
