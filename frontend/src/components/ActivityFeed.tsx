import { useState, useEffect, useCallback, useRef } from 'react';
import type { SignalRDispatchPayload, ManifestRecord } from '../types';

type FeedEvent = {
  id: string;
  type: 'dispatch' | 'assign' | 'cargo_created' | 'truck_status';
  title: string;
  description: string;
  timestamp: Date;
};

interface ActivityFeedProps {
  signalrEvent: SignalRDispatchPayload | null;
  manifests: ManifestRecord[];
  onClearEvent: () => void;
}

const eventColors = {
  dispatch: { border: 'border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  assign: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  cargo_created: { border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  truck_status: { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
};

export function ActivityFeed({ signalrEvent, manifests, onClearEvent }: ActivityFeedProps) {
  const [toasts, setToasts] = useState<FeedEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const eventIdCounter = useRef(0);

  const addEvent = useCallback((event: Omit<FeedEvent, 'id'>) => {
    const id = `evt-${++eventIdCounter.current}`;
    const feedEvent: FeedEvent = { id, ...event };
    setToasts((prev) => [feedEvent, ...prev].slice(0, 50));

    // Show brief toast notification
    const toast = document.createElement('div');
    toast.id = `toast-${id}`;
    document.body.appendChild(toast);
  }, []);

  // Listen for SignalR dispatch events
  useEffect(() => {
    if (!signalrEvent) return;
    addEvent({
      type: 'dispatch',
      title: 'Dispatch Completed',
      description: `${signalrEvent.cargoCount} items assigned across ${signalrEvent.truckIds.length} trucks (score: ${signalrEvent.totalPriorityScore})`,
      timestamp: new Date(signalrEvent.timestamp),
    });
    onClearEvent();
  }, [signalrEvent, addEvent, onClearEvent]);

  // Listen for new manifests
  useEffect(() => {
    if (manifests.length === 0) return;
    const latest = manifests[0];
    addEvent({
      type: 'assign',
      title: `Truck ${latest.truckId.slice(0, 8)} loaded`,
      description: `${latest.cargoCount ?? 0} items · ${latest.totalWeightKg.toFixed(0)} kg · ${latest.algorithmUsed}`,
      timestamp: new Date(latest.runTimestamp),
    });
  }, [manifests, addEvent]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        title="Activity Feed"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {toasts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {toasts.length > 9 ? '9+' : toasts.length}
          </span>
        )}
      </button>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2">
        {toasts.slice(0, 5).map((event) => (
          <ToastNotification key={event.id} event={event} onDismiss={() => setToasts((prev) => prev.filter((e) => e.id !== event.id))} />
        ))}
      </div>

      {/* Side panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-96 animate-slide-in-right shadow-2xl">
          <div className="flex-1 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                  <svg className="h-4 w-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Activity Feed</h3>
              </div>
              <div className="flex items-center gap-2">
                {toasts.length > 0 && (
                  <button
                    onClick={() => setToasts([])}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-64px)] space-y-1 overflow-y-auto p-4">
              {toasts.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <svg className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-sm text-slate-400 dark:text-slate-500">No recent activity</p>
                  <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Events will appear here in real-time</p>
                </div>
              ) : (
                toasts.map((event) => (
                  <FeedItem key={event.id} event={event} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Sub-components ─── */

function ToastNotification({ event, onDismiss }: { event: FeedEvent; onDismiss: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const colors = eventColors[event.type];

  return (
    <div
      className={`flex w-80 items-start gap-3 rounded-xl border-l-4 bg-white p-4 shadow-lg ring-1 ring-slate-900/5 transition-all duration-300 dark:bg-slate-800 dark:ring-slate-100/5 ${
        colors.border
      } ${colors.bg} ${visible ? 'animate-slide-in translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
    >
      <div className={`mt-0.5 flex h-2.5 w-2.5 shrink-0 rounded-full ${colors.icon}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{event.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{event.description}</p>
        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
          {event.timestamp.toLocaleTimeString()}
        </p>
      </div>
      <button onClick={onDismiss} className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function FeedItem({ event }: { event: FeedEvent }) {
  const colors = eventColors[event.type];
  const iconMap = {
    dispatch: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    assign: 'M13 10V3L4 14h7v7l9-11h-7z',
    cargo_created: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    truck_status: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  };

  return (
    <div className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconMap[event.type]} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{event.title}</p>
          <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
            {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{event.description}</p>
      </div>
    </div>
  );
}
