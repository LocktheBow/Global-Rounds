import { useMemo, useRef, useState, useEffect } from 'react';
import type { CommandFinanceInsight } from '../../types/command';

interface FinancePulseCardProps {
  insight: CommandFinanceInsight | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

const defaultSegments = [
  { label: 'Labor hrs saved', color: '#22d3ee' },
  { label: 'Projected cash ($K)', color: '#38bdf8' },
  { label: 'DSO improvement', color: '#facc15' },
] as const;

const emptyFallback = 'Run the finance agent to populate ROI metrics.';

export const FinancePulseCard = ({ insight, loading = false, error, compact = false }: FinancePulseCardProps) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState<number>(200);
  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (!containerRef.current || !headerRef.current) return;
      const ch = containerRef.current.clientHeight || 0;
      const hh = headerRef.current.clientHeight || 0;
      const avail = Math.max(ch - hh - 24, 120);
      setBodyHeight(avail);
    }) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    if (ro && headerRef.current) ro.observe(headerRef.current);
    return () => ro && ro.disconnect();
  }, []);
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
    <article
      className="gr-auto rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg"
      style={compact ? { height: 340, display: 'flex', flexDirection: 'column' } : { height: 'auto', display: 'block' }}
      ref={(el) => (containerRef.current = el)}
    >
      <header className="mb-2 flex flex-col gap-1" ref={(el) => (headerRef.current = el)}>
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

      <div className="mt-2 flex flex-col gap-3" style={{ height: 'auto' }}>
        {loading ? (
          <span className="text-xs text-slate-500" aria-live="polite">
            Loading finance insights…
          </span>
        ) : !hasData ? (
          <p className="text-sm text-slate-500">{error ?? emptyFallback}</p>
        ) : null}

        <ul className="flex flex-col gap-2" style={compact ? { maxHeight: bodyHeight, overflow: 'hidden' } : undefined}>
          {normalized.slice(0, compact ? Math.max(1, Math.floor(bodyHeight / 32)) : normalized.length).map((segment) => {
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
        {compact && normalized.length > Math.max(1, Math.floor(bodyHeight / 32)) ? (
          <div className="mt-1 text-right text-xs text-slate-400">+ View all</div>
        ) : null}

        {compact ? null : (
          <footer className="text-xs text-slate-500">
            <p>DSO baseline {baselineDso} days.</p>
            {snapshotCopy ? <p>As of {snapshotCopy}.</p> : null}
          </footer>
        )}
      </div>
    </article>
  );
};

export default FinancePulseCard;
