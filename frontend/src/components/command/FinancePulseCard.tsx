import { useMemo } from 'react';
import type { CommandFinanceInsight } from '../../types/command';

interface FinancePulseCardProps {
  insight: CommandFinanceInsight | null;
  loading?: boolean;
  error?: string | null;
}

const defaultSegments = [
  { label: 'Labor hrs saved', color: '#22d3ee' },
  { label: 'Projected cash ($K)', color: '#38bdf8' },
  { label: 'DSO improvement', color: '#facc15' },
] as const;

const emptyFallback = 'Run the finance agent to populate ROI metrics.';

export const FinancePulseCard = ({ insight, loading = false, error }: FinancePulseCardProps) => {
  const normalized = useMemo(() => {
    if (!insight?.dataset || insight.dataset.length === 0) {
      return defaultSegments.map((segment) => ({
        label: segment.label,
        value: 0,
        displayValue: '0',
        color: segment.color,
      }));
    }
    return insight.dataset.map((segment, index) => ({
      label: segment.label,
      value: Number(segment.value) || 0,
      displayValue:
        segment.displayValue ??
        (Number(segment.value) || 0).toLocaleString(undefined, {
          maximumFractionDigits: 1,
        }),
      color: segment.color ?? defaultSegments[index % defaultSegments.length].color,
    }));
  }, [insight?.dataset]);

  const hasData = normalized.some((segment) => segment.value > 0);
  const maxValue = normalized.reduce((acc, segment) => Math.max(acc, segment.value), 0);
  const baselineDso = Number(insight?.meta?.baselineDso ?? 45) || 45;
  const snapshotCopy = useMemo(() => {
    const snapshot = insight?.meta?.snapshotDate;
    if (!snapshot) return null;
    const parsed = new Date(snapshot);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString();
  }, [insight?.meta?.snapshotDate]);

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Finance pulse
        </p>
        <h3 className="text-lg font-semibold text-slate-100">
          {hasData ? 'Savings snapshot' : 'No measurable impact yet'}
        </h3>
        <p className="text-xs text-slate-400">
          Tracking reclaimed labor, projected cash, and days sales outstanding improvements.
        </p>
      </header>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {loading ? (
          <span className="text-xs text-slate-500" aria-live="polite">
            Loading finance insights…
          </span>
        ) : !hasData ? (
          <p className="text-sm text-slate-500">{error ?? emptyFallback}</p>
        ) : null}

        <ul className="flex flex-1 flex-col gap-3">
          {normalized.map((segment) => {
            const width =
              maxValue > 0
                ? segment.value > 0
                  ? Math.max((segment.value / maxValue) * 100, 8)
                  : 0
                : 0;
            return (
              <li key={segment.label}>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden
                    />
                    {segment.label}
                  </span>
                  <span className="font-medium">{segment.displayValue}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${width}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <footer className="text-xs text-slate-500">
          <p>DSO baseline {baselineDso} days.</p>
          {snapshotCopy ? <p>As of {snapshotCopy}.</p> : null}
        </footer>
      </div>
    </article>
  );
};

export default FinancePulseCard;
