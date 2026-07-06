import { ScanText, Braces, Shield } from 'lucide-react';

const ATTEMPT_CONFIG = [
  {
    key: 'analyze',
    label: 'Analyze Manifesto',
    icon: ScanText,
    status: 'Analyzing cargo manifesto with Gemini...',
    barSpeed: 'duration-[1000ms]',
    barWidth: 'w-3/5',
  },
  {
    key: 'structure',
    label: 'Structure Records',
    icon: Braces,
    status: 'Standardizing schemas and structuring records...',
    barSpeed: 'duration-[2000ms]',
    barWidth: 'w-4/5',
  },
  {
    key: 'constrain',
    label: 'Enforce Integrity',
    icon: Shield,
    status: 'Enforcing database integrity constraints...',
    barSpeed: 'duration-[4000ms]',
    barWidth: 'w-11/12',
  },
] as const;

interface AiParseLoaderProps {
  retryAttempt: number;
}

function ScanningIcon() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
      <ScanText className="h-5 w-5" />
      <div className="absolute inset-x-0 h-0.5 animate-scan-line bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-70" />
    </div>
  );
}

function PulsingIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 animate-glow-pulse dark:bg-amber-900/30 dark:text-amber-400">
      <Braces className="h-5 w-5" />
    </div>
  );
}

function SpinningIcon() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
      <div className="absolute inset-0 rounded-xl border-2 border-transparent border-t-emerald-400 animate-spin" />
      <Shield className="h-5 w-5" />
    </div>
  );
}

function StepIndicator({ current, index, label }: { current: number; index: number; label: string }) {
  const isActive = current >= index;
  const isComplete = current > index;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
          isComplete
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : isActive
              ? 'border-indigo-500 bg-indigo-500 text-white'
              : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'
        }`}
      >
        {isComplete ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          index + 1
        )}
      </div>
      <span className={`text-[10px] font-medium leading-tight ${
        isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
      }`}>
        {label}
      </span>
    </div>
  );
}

export function AiParseLoader({ retryAttempt }: AiParseLoaderProps) {
  const config = ATTEMPT_CONFIG[retryAttempt] ?? ATTEMPT_CONFIG[0];
  const IconComponent = retryAttempt === 0 ? ScanningIcon : retryAttempt === 1 ? PulsingIcon : SpinningIcon;

  return (
    <div className="animate-fade-in space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      {/* Progress Step Tracker */}
      <div className="flex items-center justify-center gap-0">
        {ATTEMPT_CONFIG.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <StepIndicator current={retryAttempt} index={i} label={step.label} />
            {i < ATTEMPT_CONFIG.length - 1 && (
              <div className="mx-2 h-px w-12 bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full bg-emerald-500 transition-all duration-500 ${
                    retryAttempt > i ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status row */}
      <div className="flex items-center gap-4">
        <IconComponent />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {config.status}
          </p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            Attempt {retryAttempt + 1} of {ATTEMPT_CONFIG.length}
            {retryAttempt > 0 && (
              <span className="ml-1.5 text-amber-500">
                &middot; Retry {retryAttempt}x
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Glowing progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-progress-glow transition-all ${config.barSpeed} ${config.barWidth}`}
        />
      </div>

      {/* Skeleton cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="animate-pulse space-y-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-700/50">
          <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-600" />
          <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-600" />
          <div className="h-2 w-1/2 rounded bg-slate-200 dark:bg-slate-600" />
        </div>
        <div className="animate-pulse space-y-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-700/50">
          <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-600" />
          <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-600" />
          <div className="h-2 w-3/4 rounded bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>
    </div>
  );
}
