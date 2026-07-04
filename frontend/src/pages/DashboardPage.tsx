import { useState, useEffect, useRef, useCallback } from 'react';
import { useCargo } from '../hooks/useCargo';
import { useTrucks } from '../hooks/useTrucks';
import { useSignalR } from '../hooks/useSignalR';
import { DispatchRunButton } from '../components/DispatchRunButton';
import { DispatchResultCard } from '../components/DispatchResultCard';
import { TruckCapacityBar } from '../components/TruckCapacityBar';
import { PriorityBadge } from '../components/PriorityBadge';
import { ErrorBanner } from '../components/ErrorBanner';
import { SkeletonCargoCard, SkeletonTruckCard } from '../components/SkeletonLoaders';
import type { ManifestRecord, DispatchRunResponse, Priority, Cargo, Truck } from '../types';

export function DashboardPage() {
  const { pendingCargoes, isLoading: cargoLoading, refetch: refetchCargo } = useCargo();
  const { trucks, isLoading: truckLoading, availableTrucks, refetch: refetchTrucks } = useTrucks();
  const { lastDispatchEvent, clearLastDispatchEvent } = useSignalR();

  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [liveManifests, setLiveManifests] = useState<ManifestRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [assignedWeights, setAssignedWeights] = useState<Record<string, number>>({});
  const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());
  const prevPendingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(pendingCargoes.map((c) => c.id));
    const prevIds = prevPendingIdsRef.current;
    const removed = new Set([...prevIds].filter((id) => !currentIds.has(id)));
    if (removed.size > 0) {
      setAnimatingOutIds(removed);
      const timer = setTimeout(() => setAnimatingOutIds(new Set()), 300);
      return () => clearTimeout(timer);
    }
    prevPendingIdsRef.current = currentIds;
  }, [pendingCargoes]);

  const handleDispatchStart = useCallback(() => {
    setDispatchError(null);
    setIsRunning(true);
  }, []);

  const handleDispatchComplete = useCallback((result: DispatchRunResponse) => {
    setLiveManifests((prev: ManifestRecord[]) => [...result.manifests, ...prev]);
    setIsRunning(false);
    refetchCargo();
    refetchTrucks();
    clearLastDispatchEvent();

    const weights: Record<string, number> = {};
    for (const m of result.manifests) {
      weights[m.truckId] = (weights[m.truckId] ?? 0) + m.totalWeightKg;
    }
    setAssignedWeights((prev: Record<string, number>) => ({ ...prev, ...weights }));
  }, [refetchCargo, refetchTrucks, clearLastDispatchEvent]);

  const handleDispatchError = useCallback((error: string) => {
    setDispatchError(error);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (lastDispatchEvent) {
      clearLastDispatchEvent();
    }
  }, [lastDispatchEvent, clearLastDispatchEvent]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header bar with Run Dispatch */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Dispatch Controls</h2>
          <DispatchRunButton
            availableTrucks={availableTrucks.map((t: Truck) => ({ id: t.id, plateNumber: t.plateNumber }))}
            onDispatchStart={handleDispatchStart}
            onDispatchComplete={handleDispatchComplete}
            onDispatchError={handleDispatchError}
            signalrDispatchEvent={lastDispatchEvent}
            clearSignalrEvent={clearLastDispatchEvent}
          />
        </div>
      </div>

      {dispatchError && (
        <div className="mb-4">
          <ErrorBanner message={dispatchError} onDismiss={() => setDispatchError(null)} />
        </div>
      )}

      {isRunning && (
        <div className="mb-4 animate-fade-in rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          Dispatch running — waiting for completion event...
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN — Pending Cargo Queue */}
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Pending Cargo Queue
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {pendingCargoes.length}
              </span>
            </h3>
          </div>
          <div className="max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto p-3">
            {cargoLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCargoCard key={i} />)
            ) : pendingCargoes.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No pending cargo
              </p>
            ) : (
              pendingCargoes.map((c: Cargo) => (
                <PendingCargoCard
                  key={c.id}
                  cargo={c}
                  isAnimatingOut={animatingOutIds.has(c.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* CENTER COLUMN — Fleet Overview */}
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Available Fleet</h3>
          </div>
          <div className="grid max-h-[calc(100vh-300px)] grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2">
            {truckLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonTruckCard key={i} />)
            ) : trucks.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No trucks registered
              </p>
            ) : (
              trucks.map((t: Truck) => (
                <TruckCard
                  key={t.id}
                  truck={t}
                  assignedWeight={assignedWeights[t.id] ?? 0}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Live Manifest Stream */}
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Live Manifest Stream</h3>
          </div>
          <div className="max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto p-3">
            {liveManifests.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No dispatch runs yet
              </p>
            ) : (
              liveManifests.map((m: ManifestRecord, i: number) => (
                <DispatchResultCard key={`${m.id}-${i}`} manifest={m} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingCargoCard({ cargo, isAnimatingOut }: { cargo: Cargo; isAnimatingOut: boolean }) {
  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-slate-800 ${
        isAnimatingOut ? 'animate-slide-out opacity-0' : 'animate-slide-in'
      } ${getPriorityBorder(cargo.priority)}`}
    >
      <div className="mb-2 flex items-start justify-between">
        <p className="line-clamp-1 text-sm font-medium text-slate-800 dark:text-slate-200">{cargo.description}</p>
        <PriorityBadge priority={cargo.priority as Priority} />
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{cargo.weightKg.toFixed(0)} kg</span>
        <span>{cargo.destination}</span>
        {cargo.isFragile && <span className="text-amber-500">Fragile</span>}
      </div>
    </div>
  );
}

function TruckCard({ truck, assignedWeight }: { truck: Truck; assignedWeight: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{truck.plateNumber}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          truck.isAvailable
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}>
          {truck.isAvailable ? 'Active' : 'Inactive'}
        </span>
      </div>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{truck.route}</p>
      <TruckCapacityBar
        assignedWeight={assignedWeight}
        maxCapacity={truck.maxCapacityKg}
      />
    </div>
  );
}

function getPriorityBorder(priority: string): string {
  switch (priority) {
    case 'Urgent': return 'border-l-4 border-l-red-500';
    case 'High': return 'border-l-4 border-l-orange-500';
    case 'Medium': return 'border-l-4 border-l-blue-500';
    default: return 'border-l-4 border-l-slate-300 dark:border-l-slate-600';
  }
}
