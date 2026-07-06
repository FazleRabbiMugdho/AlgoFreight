import { useState, useCallback, useRef, useEffect } from 'react';
import { cargoApi } from '../api/cargoApi';
import { ApiRequestError } from '../api/apiClient';
import { AiParseLoader } from './AiParseLoader';
import type { ParsedCargoResponse } from '../types';

const RATE_LIMIT = 10;
const COOLDOWN_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1_000, 2_000, 4_000];

interface RateLimitInfo {
  remaining: number;
  limit: number;
  isCooldown: boolean;
  cooldownEndsAt: number | null;
}

interface CargoIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (parsed: ParsedCargoResponse) => Promise<void>;
}

function RadialCooldown({ progress }: { progress: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-600" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-purple-500 transition-all duration-300 ease-linear"
      />
      <text
        x="22"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-600 text-[9px] font-semibold dark:fill-slate-300"
      >
        {Math.round(progress * 100)}%
      </text>
    </svg>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function CargoIntakeModal({ isOpen, onClose, onConfirm }: CargoIntakeModalProps) {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedCargoResponse | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(-1);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({
    remaining: RATE_LIMIT,
    limit: RATE_LIMIT,
    isCooldown: false,
    cooldownEndsAt: null,
  });

  const abortRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!rateLimit.isCooldown || !rateLimit.cooldownEndsAt) return;

    cooldownTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (now >= rateLimit.cooldownEndsAt!) {
        setRateLimit({
          remaining: RATE_LIMIT,
          limit: RATE_LIMIT,
          isCooldown: false,
          cooldownEndsAt: null,
        });
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
        return;
      }
      setRateLimit((prev) => ({ ...prev }));
    }, 100);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [rateLimit.isCooldown, rateLimit.cooldownEndsAt]);

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) return;

    setRateLimit((prev) => {
      const next = prev.remaining - 1;
      return { ...prev, remaining: Math.max(0, next) };
    });

    abortRef.current = false;
    setError(null);
    setParsed(null);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (abortRef.current) break;

      setRetryAttempt(attempt);

      if (attempt > 0) {
        await sleep(RETRY_DELAYS[attempt - 1]);
        if (abortRef.current) break;
      }

      try {
        const result = await cargoApi.parseNaturalLanguage(rawText);
        setParsed(result);
        setRetryAttempt(-1);
        return;
      } catch (err) {
        if (abortRef.current) break;

        if (err instanceof ApiRequestError && err.status === 429) {
          const cooldownEndsAt = Date.now() + COOLDOWN_MS;
          setRateLimit({ remaining: 0, limit: RATE_LIMIT, isCooldown: true, cooldownEndsAt });
          setError('Rate limit reached. Please wait before trying again.');
          setRetryAttempt(-1);
          return;
        }

        const isRetryable = err instanceof ApiRequestError && err.status >= 500;
        if (isRetryable && attempt < MAX_RETRIES - 1) continue;

        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError('Failed to parse cargo description');
        }
        setRetryAttempt(-1);
        return;
      }
    }

    setRetryAttempt(-1);
    setError('Gemini API did not respond in time. Please try again.');
  }, [rawText]);

  const handleConfirm = useCallback(async () => {
    if (!parsed) return;
    setIsConfirming(true);
    try {
      await onConfirm(parsed);
      setRawText('');
      setParsed(null);
      onClose();
    } catch {
      setError('Failed to confirm cargo');
    } finally {
      setIsConfirming(false);
    }
  }, [parsed, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    abortRef.current = true;
    setRawText('');
    setParsed(null);
    setError(null);
    setRetryAttempt(-1);
    onClose();
  }, [onClose]);

  const [cooldownRemainingMs, setCooldownRemaining] = useState(0);
  const cooldownSeconds = Math.ceil(cooldownRemainingMs / 1000);
  const cooldownProgress = rateLimit.cooldownEndsAt
    ? Math.max(0, cooldownRemainingMs / COOLDOWN_MS)
    : 0;

  useEffect(() => {
    if (!rateLimit.isCooldown || !rateLimit.cooldownEndsAt) return;
    function tick() { setCooldownRemaining(Math.max(0, rateLimit.cooldownEndsAt! - Date.now())); }
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [rateLimit.isCooldown, rateLimit.cooldownEndsAt]);

  const isParseDisabled = !rawText.trim() || retryAttempt >= 0 || rateLimit.isCooldown;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl animate-fade-in rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">AI Cargo Intake</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Describe your cargo in natural language</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:flex ${
              rateLimit.remaining <= 2
                ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                : rateLimit.remaining <= 5
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Credits: <span className="font-semibold tabular-nums">{rateLimit.remaining}</span>/{rateLimit.limit}
              <span className="hidden lg:inline">&nbsp;remaining this window</span>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {/* Input area — only visible when not parsing */}
          {retryAttempt < 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Natural Language Input</label>
              <div className="relative">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder='e.g. "Ship 500kg of electronics from NYC to Chicago, fragile and urgent"'
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-purple-500 dark:focus:ring-purple-500/20"
                  disabled={rateLimit.isCooldown}
                />
                {rawText && (
                  <button
                    onClick={() => setRawText('')}
                    className="absolute right-3 top-3 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AI Parse Loader */}
          {retryAttempt >= 0 && (
            <AiParseLoader retryAttempt={retryAttempt} />
          )}

          {/* Parse button — only visible when not parsing */}
          {retryAttempt < 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleParse}
                disabled={isParseDisabled}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-500 hover:to-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rateLimit.isCooldown ? (
                  <>
                    <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Rate limit reached. Please wait ({cooldownSeconds}s)
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Parse with AI
                  </>
                )}
              </button>

              {rateLimit.isCooldown && (
                <div className="shrink-0" title={`Cooldown: ${cooldownSeconds}s remaining`}>
                  <RadialCooldown progress={cooldownProgress} />
                </div>
              )}
            </div>
          )}

          {/* Credits usage bar */}
          <div className="flex items-center gap-2 sm:hidden">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  rateLimit.remaining <= 2
                    ? 'bg-red-500'
                    : rateLimit.remaining <= 5
                      ? 'bg-amber-500'
                      : 'bg-purple-500'
                }`}
                style={{ width: `${(rateLimit.remaining / rateLimit.limit) * 100}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {rateLimit.remaining}/{rateLimit.limit} credits
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="animate-fade-in rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Side-by-side comparison */}
          {parsed && (
            <div className="animate-fade-in grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/30">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-600">
                    <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Raw Input</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{rawText}</p>
              </div>

              <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-4 shadow-sm dark:border-purple-800 dark:from-purple-950/40 dark:to-blue-950/40">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-200 dark:bg-purple-800">
                    <svg className="h-3.5 w-3.5 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Parsed Data</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Description</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{parsed.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Weight</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{parsed.weightKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Destination</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{parsed.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Priority</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{parsed.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Fragile</span>
                    <span className={`font-medium ${parsed.isFragile ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                      {parsed.isFragile ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsed && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <button
              onClick={handleClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConfirming ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Dispatching...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm &amp; Dispatch
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
