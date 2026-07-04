import type { ConnectionState } from '../types';

interface ColdStartBannerProps {
  connectionState: ConnectionState;
  loadingDuration: number;
}

export function ColdStartBanner({ connectionState, loadingDuration }: ColdStartBannerProps) {
  const showBanner =
    (connectionState === 'Connecting' || connectionState === 'Disconnected' || connectionState === 'Reconnecting') &&
    loadingDuration > 3000;

  if (!showBanner) return null;

  const message =
    connectionState === 'Reconnecting'
      ? 'Connection lost. Reconnecting...'
      : 'Establishing engine connection (waking up server, please wait...)';

  return (
    <div className="fixed left-0 right-0 top-16 z-40 mx-auto max-w-2xl animate-fade-in px-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700 shadow-lg dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse-slow rounded-full bg-amber-500" />
          {message}
        </div>
      </div>
    </div>
  );
}
