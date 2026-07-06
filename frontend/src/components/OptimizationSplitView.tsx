import { useState, type DragEvent } from 'react';
import type { Cargo, Truck, ManifestRecord, CargoAssignmentState } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { TruckCapacityBar } from './TruckCapacityBar';

interface OptimizationSplitViewProps {
  cargoes: Cargo[];
  trucks: Truck[];
  manifests: ManifestRecord[];
  assignedWeights: Record<string, number>;
  assignmentStates: Record<string, CargoAssignmentState>;
  onAssign: (cargoId: string, truckId: string) => void;
  isLoadingCargo: boolean;
  isLoadingTrucks: boolean;
  isAnimating: boolean;
  animatingOutIds: Set<string>;
}

const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export function OptimizationSplitView({
  cargoes,
  trucks,
  assignedWeights,
  assignmentStates,
  onAssign,
  isLoadingCargo,
  isLoadingTrucks,
  isAnimating,
  animatingOutIds,
}: OptimizationSplitViewProps) {
  // Show only cargo that isn't confirmed (still pending, syncing, or failed)
  const visibleCargoes = cargoes.filter((c) => {
    const state = assignmentStates[c.id];
    return !state || state.status !== 'confirmed';
  });

  const sortedCargoes = [...visibleCargoes].sort(
    (a, b) => {
      const priorityDiff = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      return b.weightKg - a.weightKg;
    },
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* LEFT — Unassigned Cargo */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Unassigned Cargo</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {sortedCargoes.length}
              <span className="text-slate-400 dark:text-slate-500">items</span>
            </span>
          </div>
          <div className="max-h-[calc(100vh-340px)] space-y-2 overflow-y-auto p-4">
            {isLoadingCargo ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg bg-slate-100 p-4 dark:bg-slate-700">
                  <div className="mb-2 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-600" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-600" />
                </div>
              ))
            ) : sortedCargoes.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <svg className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm text-slate-400 dark:text-slate-500">All cargo assigned</p>
              </div>
            ) : (
              sortedCargoes.map((cargo, index) => {
                const state = assignmentStates[cargo.id];
                return (
                  <div
                    key={cargo.id}
                    className={
                      isAnimating
                        ? 'animate-shuffle'
                        : animatingOutIds.has(cargo.id)
                          ? 'animate-slide-out-right'
                          : state?.status === 'failed'
                            ? 'animate-slide-in-left'
                            : ''
                    }
                    style={isAnimating ? { animationDelay: `${index * 40}ms` } : undefined}
                  >
                    <DraggableCargoCard
                      cargo={cargo}
                      state={state}
                      onDragStart={(e) => {
                        if (state?.status === 'syncing') return;
                        e.dataTransfer.setData('text/plain', cargo.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT — Fleet Capacity */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Fleet Capacity</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {trucks.length}
              <span className="text-slate-400 dark:text-slate-500">trucks</span>
            </span>
          </div>
          <div className="grid max-h-[calc(100vh-340px)] auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-2">
            {isLoadingTrucks ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg bg-slate-100 p-4 dark:bg-slate-700">
                  <div className="mb-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-600" />
                  <div className="mb-2 h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-600" />
                  <div className="h-2 rounded bg-slate-200 dark:bg-slate-600" />
                </div>
              ))
            ) : trucks.length === 0 ? (
              <div className="col-span-full flex flex-col items-center py-12 text-center">
                <svg className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm text-slate-400 dark:text-slate-500">No trucks registered</p>
              </div>
            ) : (
              trucks.map((truck, index) => (
                <div
                  key={truck.id}
                  className={isAnimating ? 'animate-shuffle' : ''}
                  style={isAnimating ? { animationDelay: `${index * 60 + 200}ms` } : undefined}
                >
                  <DroppableTruckCard
                    truck={truck}
                    assignedWeight={assignedWeights[truck.id] ?? 0}
                    onDrop={(cargoId) => onAssign(cargoId, truck.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function DraggableCargoCard({ cargo, state, onDragStart }: { cargo: Cargo; state?: CargoAssignmentState; onDragStart: (e: DragEvent<HTMLDivElement>) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);

  // Flash checkmark when transitioning to confirmed
  const prevStatusRef = useState<string | undefined>(undefined);
  if (state?.status === 'confirmed' && prevStatusRef[0] !== 'confirmed') {
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 1000);
  }
  prevStatusRef[0] = state?.status;

  const isSyncing = state?.status === 'syncing';
  const isFailed = state?.status === 'failed';
  const isDisallowed = isSyncing || isFailed;

  return (
    <div
      draggable={!isDisallowed}
      onDragStart={(e) => {
        if (isDisallowed) { e.preventDefault(); return; }
        setIsDragging(true);
        onDragStart(e);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={`group relative rounded-lg border bg-white p-3 shadow-sm transition-all duration-200 dark:bg-slate-800/80 ${
        isDragging
          ? 'border-blue-400 bg-blue-50 opacity-50 shadow-lg dark:border-blue-500 dark:bg-blue-900/20'
          : isSyncing
            ? 'border-dashed border-amber-400 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-900/10'
            : isFailed
              ? 'border-red-400 bg-red-50/50 dark:border-red-500 dark:bg-red-900/10'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
      } ${isDisallowed ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-1 text-sm font-medium text-slate-800 dark:text-slate-200">{cargo.description}</p>
        <PriorityBadge priority={cargo.priority} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {cargo.weightKg.toFixed(0)} kg
        </span>
        <span className="inline-flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {cargo.destination}
        </span>
        {cargo.isFragile && (
          <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-400">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Fragile
          </span>
        )}
      </div>

      {/* Status overlays */}
      {isSyncing && (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 shadow-sm dark:border-amber-600 dark:bg-amber-900/60 dark:text-amber-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Syncing
        </div>
      )}

      {isFailed && (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 shadow-sm dark:border-red-600 dark:bg-red-900/60 dark:text-red-300">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Failed
        </div>
      )}

      {/* Confirmed flash checkmark */}
      {showCheckmark && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-emerald-500/20 backdrop-blur-[1px] animate-flash-checkmark">
          <svg className="h-8 w-8 text-emerald-500 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}

function DroppableTruckCard({ truck, assignedWeight, onDrop }: { truck: Truck; assignedWeight: number; onDrop: (cargoId: string) => void }) {
  const [isOver, setIsOver] = useState(false);
  const pct = truck.maxCapacityKg > 0 ? Math.min((assignedWeight / truck.maxCapacityKg) * 100, 100) : 0;

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  }

  function handleDragLeave() {
    setIsOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsOver(false);
    const cargoId = e.dataTransfer.getData('text/plain');
    if (cargoId) onDrop(cargoId);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 dark:bg-slate-800/80 ${
        isOver
          ? 'border-emerald-400 bg-emerald-50 shadow-lg ring-2 ring-emerald-400/30 dark:border-emerald-500 dark:bg-emerald-900/20'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
      } ${pct >= 100 ? 'border-amber-300 dark:border-amber-600' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            truck.isAvailable
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
          }`}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{truck.plateNumber}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{truck.route}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          truck.isAvailable
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}>
          {truck.isAvailable ? 'Active' : 'Inactive'}
        </span>
      </div>

      <TruckCapacityBar
        assignedWeight={assignedWeight}
        maxCapacity={truck.maxCapacityKg}
      />

      <div className="mt-2 flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
        <span>Weight: {assignedWeight.toFixed(0)} / {truck.maxCapacityKg.toFixed(0)} kg</span>
        <span className={pct >= 95 ? 'font-medium text-amber-500 dark:text-amber-400' : ''}>
          {pct.toFixed(0)}% full
        </span>
      </div>
    </div>
  );
}
