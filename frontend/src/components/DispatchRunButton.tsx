import { useState } from 'react';
import { dispatchApi } from '../api/dispatchApi';
import type { AlgorithmType, DispatchRunResponse, SignalRDispatchPayload } from '../types';
import { ApiRequestError } from '../api/apiClient';

interface DispatchRunButtonProps {
  availableTrucks: { id: string; plateNumber: string }[];
  onDispatchStart: () => void;
  onDispatchComplete: (result: DispatchRunResponse) => void;
  onDispatchError: (error: string) => void;
  signalrDispatchEvent: SignalRDispatchPayload | null;
  clearSignalrEvent: () => void;
}

export function DispatchRunButton({
  availableTrucks,
  onDispatchStart,
  onDispatchComplete,
  onDispatchError,
}: DispatchRunButtonProps) {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('GreedyFirstFitDecreasing');
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    try {
      setIsRunning(true);
      onDispatchStart();
      const result = await dispatchApi.runDispatch(algorithm, selectedTruckId);
      onDispatchComplete(result);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        onDispatchError(err.message);
      } else {
        onDispatchError('Failed to run dispatch');
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={algorithm}
        onChange={(e) => {
          const val = e.target.value as AlgorithmType;
          setAlgorithm(val);
          if (val !== 'ExactKnapsack') setSelectedTruckId(null);
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        <option value="GreedyFirstFitDecreasing">Greedy (Multi-Truck)</option>
        <option value="ExactKnapsack">Exact Knapsack (Single Truck)</option>
      </select>

      {algorithm === 'ExactKnapsack' && (
        <select
          value={selectedTruckId ?? ''}
          onChange={(e) => setSelectedTruckId(e.target.value || null)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">Select a truck...</option>
          {availableTrucks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.plateNumber}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={handleRun}
        disabled={isRunning || (algorithm === 'ExactKnapsack' && !selectedTruckId)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        {isRunning ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Running...
          </span>
        ) : (
          'Run Dispatch'
        )}
      </button>
    </div>
  );
}
