import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSignalR } from '../hooks/useSignalR';
import { ConnectionBadge } from './ConnectionBadge';
import { ColdStartBanner } from './ColdStartBanner';
import { CommandPalette } from './CommandPalette';
import { ShortcutCheatSheet } from './ShortcutCheatSheet';
import algoFreightLogo from '../logo/AlgoFreight.png';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/dispatch', label: 'Dispatch' },
  { to: '/cargo', label: 'Cargo' },
  { to: '/trucks', label: 'Trucks' },
  { to: '/history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
];

export function Layout() {
  const navigate = useNavigate();
  const { connectionState } = useSignalR();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('algofreight-dark-mode');
    return saved === 'true';
  });
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('algofreight-dark-mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (connectionState === 'Connecting' || connectionState === 'Disconnected') {
      const startTime = Date.now();
      const interval = setInterval(() => {
        setLoadingDuration(Date.now() - startTime);
      }, 1000);
      const reset = setTimeout(() => setLoadingDuration(0), 0);
      return () => { clearInterval(interval); clearTimeout(reset); };
    }
  }, [connectionState]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K → open palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // Cmd+Shift+K / Ctrl+Shift+K → open palette (fallback)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // Escape → close palette
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        return;
      }
      // Ctrl+Alt+* actions (global — work from any page)
      if (e.ctrlKey && e.altKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('algofreight:open-intake'));
            break;
          case 'o':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('algofreight:run-optimize'));
            break;
          case 'f':
            e.preventDefault();
            navigate('/trucks');
            break;
          case 'c':
            e.preventDefault();
            navigate('/cargo');
            break;
          case 'h':
            e.preventDefault();
            navigate('/history');
            break;
          case 'y':
            e.preventDefault();
            navigate('/analytics');
            break;
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  // Deprecated — kept only for backwards compat; intake/optimize moved to global shortcuts above
  const handleOpenIntake = useCallback(() => {
    window.dispatchEvent(new CustomEvent('algofreight:open-intake'));
  }, []);

  const handleRunOptimize = useCallback(() => {
    window.dispatchEvent(new CustomEvent('algofreight:run-optimize'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            {/* Brand logo */}
            <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
              <img
                src={algoFreightLogo}
                alt="AlgoFreight"
                className="h-20 w-20 shrink-0 rounded-full object-cover"
              />
              <span className="text-2xl font-bold tracking-tight text-[#1d4973] dark:text-[#4a8bc9]">
                AlgoFreight
              </span>
            </button>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* ⌘K / Ctrl+K command palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-500 shadow-sm backdrop-blur transition-all duration-200 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-700 hover:shadow-md sm:flex dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-300"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden md:inline">Search</span>
              <span className="hidden lg:inline text-slate-400 dark:text-slate-500">commands...</span>
              <kbd className="-mr-0.5 flex items-center gap-0.5 rounded-md border border-slate-300/70 bg-white px-1.5 py-0.5 text-[9px] font-medium shadow-sm dark:border-slate-600 dark:bg-slate-800" title="Ctrl+K / Ctrl+Shift+K">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </button>

            <ConnectionBadge state={connectionState} />

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex border-t border-slate-200 px-4 py-1 sm:hidden dark:border-slate-700">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex-1 rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>

      <ColdStartBanner connectionState={connectionState} loadingDuration={loadingDuration} />

      <main>
        <Outlet />
      </main>

      {/* Command palette overlay */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenIntake={handleOpenIntake}
        onRunOptimize={handleRunOptimize}
      />

      {/* Shortcut cheat sheet */}
      <div className="fixed bottom-4 right-4 z-40">
        <ShortcutCheatSheet />
      </div>
    </div>
  );
}
