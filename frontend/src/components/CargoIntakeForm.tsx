import { useState, useCallback } from 'react';
import type { Priority, CreateCargoRequest, ParsedCargoResponse } from '../types';
import { cargoApi } from '../api/cargoApi';
import { ApiRequestError } from '../api/apiClient';

interface CargoIntakeFormProps {
  maxCapacity: number;
  onSubmit: (data: CreateCargoRequest) => Promise<void>;
}

type InputMode = 'manual' | 'nlp';

interface ManualForm {
  description: string;
  weightKg: string;
  destination: string;
  priority: Priority;
  isFragile: boolean;
}

export function CargoIntakeForm({ maxCapacity, onSubmit }: CargoIntakeFormProps) {
  const [mode, setMode] = useState<InputMode>('manual');

  // Manual form state
  const [manual, setManual] = useState<ManualForm>({
    description: '',
    weightKg: '',
    destination: '',
    priority: 'Low',
    isFragile: false,
  });

  // NLP form state
  const [nlpText, setNlpText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed result (the "Proposed Cargo Confirmation Card")
  const [parsedCargo, setParsedCargo] = useState<ManualForm | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const weightNum = parseFloat(manual.weightKg);
  const showCapacityWarning = maxCapacity > 0 && weightNum > maxCapacity && manual.weightKg !== '';

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!manual.description || !manual.weightKg || !manual.destination) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        description: manual.description,
        weightKg: parseFloat(manual.weightKg),
        destination: manual.destination,
        priority: manual.priority,
        isFragile: manual.isFragile,
      });
      setManual({ description: '', weightKg: '', destination: '', priority: 'Low', isFragile: false });
    } catch (err) {
      if (err instanceof ApiRequestError) setSubmitError(err.message);
      else setSubmitError('Failed to create cargo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParse = async () => {
    if (!nlpText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    setParsedCargo(null);

    try {
      const result: ParsedCargoResponse = await cargoApi.parseNaturalLanguage(nlpText);
      setParsedCargo({
        description: result.description,
        weightKg: String(result.weightKg),
        destination: result.destination,
        priority: result.priority as Priority,
        isFragile: result.isFragile,
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 422) setParseError(`Could not parse: ${err.message}`);
        else if (err.status === 503) setParseError('AI parsing is temporarily unavailable. Please use the manual form.');
        else setParseError(err.message);
      } else {
        setParseError('Failed to parse cargo description');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmParsed = async () => {
    if (!parsedCargo) return;
    setSubmitError(null);
    try {
      setIsSubmitting(true);
      await onSubmit({
        description: parsedCargo.description,
        weightKg: parseFloat(parsedCargo.weightKg) || 0,
        destination: parsedCargo.destination,
        priority: parsedCargo.priority,
        isFragile: parsedCargo.isFragile,
      });
      setParsedCargo(null);
      setNlpText('');
    } catch (err) {
      if (err instanceof ApiRequestError) setSubmitError(err.message);
      else setSubmitError('Failed to create cargo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateParsedField = useCallback(<K extends keyof ManualForm>(field: K, value: ManualForm[K]) => {
    setParsedCargo((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const parsedWeightNum = parsedCargo ? parseFloat(parsedCargo.weightKg) : 0;
  const showParsedCapacityWarning = maxCapacity > 0 && parsedWeightNum > maxCapacity && parsedCargo !== null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Add Cargo</h3>

      {/* Mode switcher */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => { setMode('manual'); setParsedCargo(null); setParseError(null); }}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode('nlp')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'nlp'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
          }`}
        >
          AI Natural Language
        </button>
      </div>

      {submitError && (
        <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
          {submitError}
        </div>
      )}

      {/* Manual form */}
      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Description"
            value={manual.description}
            onChange={(e) => setManual((p) => ({ ...p, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            required
          />
          <input
            type="text"
            placeholder="Destination"
            value={manual.destination}
            onChange={(e) => setManual((p) => ({ ...p, destination: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            required
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Weight (kg)"
                value={manual.weightKg}
                onChange={(e) => setManual((p) => ({ ...p, weightKg: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                min="0"
                step="0.1"
                required
              />
              {showCapacityWarning && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  This exceeds the capacity of every truck in your fleet (largest: {maxCapacity.toFixed(0)}kg) — it will never be dispatchable as-is
                </p>
              )}
            </div>
            <select
              value={manual.priority}
              onChange={(e) => setManual((p) => ({ ...p, priority: e.target.value as Priority }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={manual.isFragile}
              onChange={(e) => setManual((p) => ({ ...p, isFragile: e.target.checked }))}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Fragile
          </label>
          <button
            type="submit"
            disabled={isSubmitting || !manual.description || !manual.weightKg || !manual.destination}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isSubmitting ? 'Saving...' : 'Add Cargo'}
          </button>
        </form>
      )}

      {/* NLP form */}
      {mode === 'nlp' && (
        <div className="space-y-3">
          <textarea
            placeholder="e.g. 200kg electronics to Chittagong, urgent, fragile"
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          />
          <button
            onClick={handleParse}
            disabled={isParsing || !nlpText.trim()}
            className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            {isParsing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Parsing...
              </span>
            ) : (
              'Parse with AI'
            )}
          </button>

          {parseError && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
              {parseError}
              <p className="mt-1 text-slate-500 dark:text-slate-400">You can use the manual form above as a fallback.</p>
            </div>
          )}

          {/* Proposed Cargo Confirmation Card */}
          {parsedCargo && (
            <div className="animate-slide-in rounded-lg border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-purple-200 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-800 dark:text-purple-300">
                  AI-derived
                </span>
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  Proposed Cargo — Review & Confirm
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Description</label>
                  <input
                    type="text"
                    value={parsedCargo.description}
                    onChange={(e) => updateParsedField('description', e.target.value)}
                    className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-purple-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Weight (kg)</label>
                    <input
                      type="number"
                      value={parsedCargo.weightKg}
                      onChange={(e) => updateParsedField('weightKg', e.target.value)}
                      className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-purple-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                    {showParsedCapacityWarning && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Exceeds every truck's capacity (largest: {maxCapacity.toFixed(0)}kg)
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Destination</label>
                    <input
                      type="text"
                      value={parsedCargo.destination}
                      onChange={(e) => updateParsedField('destination', e.target.value)}
                      className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-purple-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <select
                    value={parsedCargo.priority}
                    onChange={(e) => updateParsedField('priority', e.target.value as Priority)}
                    className="flex-1 rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-purple-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={parsedCargo.isFragile}
                      onChange={(e) => updateParsedField('isFragile', e.target.checked)}
                      className="rounded border-purple-300 dark:border-purple-700"
                    />
                    Fragile
                  </label>
                </div>
              </div>

              <button
                onClick={handleConfirmParsed}
                disabled={isSubmitting || !parsedCargo.description || !parsedCargo.weightKg || !parsedCargo.destination}
                className="mt-3 w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                {isSubmitting ? 'Saving...' : 'Confirm & Commit to Database'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
