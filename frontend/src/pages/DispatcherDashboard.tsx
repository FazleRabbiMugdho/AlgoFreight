import { useState, useEffect, useCallback, useRef } from 'react';
import { useCargo } from '../hooks/useCargo';
import { useTrucks } from '../hooks/useTrucks';
import { useSignalR } from '../hooks/useSignalR';
import { dispatchApi } from '../api/dispatchApi';
import { OptimizationSplitView } from '../components/OptimizationSplitView';
import { OptimizationAnalyticsHeader } from '../components/OptimizationAnalyticsHeader';
import { CargoIntakeModal } from '../components/CargoIntakeModal';
import { ActivityFeed } from '../components/ActivityFeed';
import { ErrorBanner } from '../components/ErrorBanner';
import { ShortcutBadge } from '../components/ShortcutBadge';
import type { ManifestRecord, Cargo, ParsedCargoResponse, CargoAssignmentState } from '../types';

const ANIMATION_MS = 400;

interface AssignmentToast {
  id: string;
  message: string;
  cargoId: string;
}

export function DispatcherDashboard() {
  const { cargoes, isLoading: cargoLoading, refetch: refetchCargo, createCargo } = useCargo();
  const { trucks, isLoading: truckLoading, refetch: refetchTrucks } = useTrucks();
  const { lastDispatchEvent, clearLastDispatchEvent } = useSignalR();

  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [manifests, setManifests] = useState<ManifestRecord[]>([]);
  const [assignedWeights, setAssignedWeights] = useState<Record<string, number>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());
  const [lastRuntimeMs, setLastRuntimeMs] = useState<number | null>(null);
  const [lastAlgorithmUsed, setLastAlgorithmUsed] = useState<string | null>(null);
  const [assignmentStates, setAssignmentStates] = useState<Record<string, CargoAssignmentState>>({});
  const [toasts, setToasts] = useState<AssignmentToast[]>([]);
  const pendingCargoes = cargoes.filter((c) => c.status === 'Pending');
  const availableTrucks = trucks.filter((t) => t.isAvailable);

  // ---- Track removal animation for refetched data ----
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

  // ---- Auto-dismiss toasts ----
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((prev) => prev.slice(1)), 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  // ---- Run Optimization Solver ----
  const handleRunOptimization = useCallback(async (algorithm = 'GreedyFirstFitDecreasing') => {
    setIsAnimating(true);
    setDispatchError(null);

    await new Promise((resolve) => setTimeout(resolve, ANIMATION_MS));
    setIsAnimating(false);

    setIsRunning(true);
    try {
      const result = await dispatchApi.runDispatch(algorithm);
      setManifests((prev) => [...result.manifests, ...prev]);
      setLastRuntimeMs(result.executionTimeMs);
      setLastAlgorithmUsed(result.algorithmUsed);
      refetchCargo();
      refetchTrucks();

      const weights: Record<string, number> = {};
      for (const m of result.manifests) {
        weights[m.truckId] = (weights[m.truckId] ?? 0) + m.totalWeightKg;
      }
      setAssignedWeights((prev) => ({ ...prev, ...weights }));
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setIsRunning(false);
    }
  }, [refetchCargo, refetchTrucks]);

  // ---- Optimistic cargo assignment with rollback ----
  const handleAssign = useCallback(async (cargoId: string, truckId: string) => {
    const cargo = pendingCargoes.find((c) => c.id === cargoId);
    if (!cargo) return;

    // 1. Optimistic update — mark as syncing immediately
    setAssignmentStates((prev) => ({
      ...prev,
      [cargoId]: { status: 'syncing', truckId },
    }));

    // Optimistically bump the truck weight
    setAssignedWeights((prev) => ({
      ...prev,
      [truckId]: (prev[truckId] ?? 0) + cargo.weightKg,
    }));

    try {
      const result = await dispatchApi.runDispatch('ExactKnapsack', truckId);
      setManifests((prev) => [...result.manifests, ...prev]);
      setLastRuntimeMs(result.executionTimeMs);
      setLastAlgorithmUsed(result.algorithmUsed);

      // 2. Success — mark as confirmed
      setAssignmentStates((prev) => ({
        ...prev,
        [cargoId]: { status: 'confirmed', truckId },
      }));

      // After the flash checkmark plays, remove the state entry entirely
      setTimeout(() => {
        setAssignmentStates((prev) => {
          const next = { ...prev };
          delete next[cargoId];
          return next;
        });
        refetchCargo();
        refetchTrucks();
      }, 1200);
    } catch (err) {
      // 3. Failure — roll back the weight and mark as failed
      setAssignedWeights((prev) => ({
        ...prev,
        [truckId]: Math.max(0, (prev[truckId] ?? 0) - cargo.weightKg),
      }));

      const errorMsg = err instanceof Error ? err.message : 'Assignment failed';
      setAssignmentStates((prev) => ({
        ...prev,
        [cargoId]: { status: 'failed', truckId: null, error: errorMsg },
      }));

      // Show error toast
      const toastId = `err-${Date.now()}`;
      setToasts((prev) => [...prev, { id: toastId, message: `Failed to assign "${cargo.description}": ${errorMsg}`, cargoId }]);

      // After the rollback animation, reset the state
      setTimeout(() => {
        setAssignmentStates((prev) => {
          const next = { ...prev };
          delete next[cargoId];
          return next;
        });
      }, 2000);
    }
  }, [pendingCargoes, refetchCargo, refetchTrucks]);

  // ---- AI Cargo Intake ----
  const handleIntakeConfirm = useCallback(async (parsed: ParsedCargoResponse) => {
    await createCargo({
      description: parsed.description,
      weightKg: parsed.weightKg,
      destination: parsed.destination,
      priority: parsed.priority as Cargo['priority'],
      isFragile: parsed.isFragile,
    });
  }, [createCargo]);

  // ---- Keep a ref to the latest callback ----
  const handleRunRef = useRef(handleRunOptimization);
  useEffect(() => { handleRunRef.current = handleRunOptimization; }, [handleRunOptimization]);

  // ---- Listen for command palette custom events ----
  useEffect(() => {
    function onIntake() { setIsIntakeOpen(true); }
    function onOptimize() { handleRunRef.current(); }
    window.addEventListener('algofreight:open-intake', onIntake);
    window.addEventListener('algofreight:run-optimize', onOptimize);
    return () => {
      window.removeEventListener('algofreight:open-intake', onIntake);
      window.removeEventListener('algofreight:run-optimize', onOptimize);
    };
  }, []);

  // ---- Summary stats ----
  const totalCapacity = trucks.reduce((sum, t) => sum + (t.isAvailable ? t.maxCapacityKg : 0), 0);
  const totalAssigned = Object.values(assignedWeights).reduce((sum, w) => sum + w, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Error toasts */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col-reverse gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-in-up flex items-center gap-3 rounded-xl border-l-4 border-red-500 bg-white px-4 py-3 shadow-lg ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-slate-100/5"
          >
            <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-slate-700 dark:text-slate-200">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-auto shrink-0 text-slate-400 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Analytics Header */}
      <div className="mb-6">
        <OptimizationAnalyticsHeader
          totalCapacityKg={totalCapacity}
          usedCapacityKg={totalAssigned}
          pendingWeightKg={pendingCargoes.reduce((sum, c) => sum + c.weightKg, 0)}
          lastRuntimeMs={lastRuntimeMs}
          lastAlgorithmUsed={lastAlgorithmUsed}
        />
      </div>

      {/* Controls bar */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Optimization Solver</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pendingCargoes.length} pending · {availableTrucks.length} available trucks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsIntakeOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-500 hover:to-blue-500 hover:shadow-md"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Intake
              <ShortcutBadge keys="Ctrl+Alt+A" />
            </button>

            <button
              onClick={() => handleRunOptimization()}
              disabled={isRunning || isAnimating || pendingCargoes.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnimating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sorting...
                </>
              ) : isRunning ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Optimizing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Optimization Solver
                  <ShortcutBadge keys="Ctrl+Alt+O" />
                </>
              )}
            </button>

            <ActivityFeed
              signalrEvent={lastDispatchEvent}
              manifests={manifests}
              onClearEvent={clearLastDispatchEvent}
            />
          </div>
        </div>
      </div>

      {/* Dispatch running indicator */}
      {isRunning && (
        <div className="mb-4 animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Solver running — cargo is being allocated across the fleet...
          </span>
        </div>
      )}

      {/* Error banner */}
      {dispatchError && (
        <div className="mb-4">
          <ErrorBanner message={dispatchError} onDismiss={() => setDispatchError(null)} />
        </div>
      )}

      {/* Optimization Split-View */}
      <OptimizationSplitView
        cargoes={pendingCargoes}
        trucks={trucks}
        manifests={manifests}
        assignedWeights={assignedWeights}
        assignmentStates={assignmentStates}
        onAssign={handleAssign}
        isLoadingCargo={cargoLoading}
        isLoadingTrucks={truckLoading}
        isAnimating={isAnimating}
        animatingOutIds={animatingOutIds}
      />

      {/* AI Cargo Intake Modal */}
      <CargoIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onConfirm={handleIntakeConfirm}
      />
    </div>
  );
}
