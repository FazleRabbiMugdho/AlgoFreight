import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSignalR } from '../hooks/useSignalR';
import { ConnectionBadge } from './ConnectionBadge';
import { ColdStartBanner } from './ColdStartBanner';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/cargo', label: 'Cargo' },
  { to: '/trucks', label: 'Trucks' },
  { to: '/history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
];

export function Layout() {
  const { connectionState } = useSignalR();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('algofreight-dark-mode');
    return saved === 'true';
  });
  const [loadingDuration, setLoadingDuration] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('algofreight-dark-mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (connectionState === 'Connecting' || connectionState === 'Disconnected') {
      const interval = setInterval(() => {
        setLoadingDuration((prev) => prev + 1000);
      }, 1000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingDuration(0);
  }, [connectionState]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">
              AlgoFreight
            </span>
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

          <div className="flex items-center gap-3">
            <ConnectionBadge state={connectionState} />

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
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
    </div>
  );
}
