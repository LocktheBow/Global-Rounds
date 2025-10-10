import { useMemo, useRef, useState, useEffect } from 'react';
import type { CommandInventoryInsight } from '../../types/command';

interface InventoryActionsCardProps {
  insight: CommandInventoryInsight | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

const defaultSegments = [
  { label: 'Reorder now', color: '#f97316' },
  { label: 'Monitor closely', color: '#fb7185' },
  { label: 'Healthy buffer', color: '#22c55e' },
] as const;

const emptyFallback = 'No active recommendations. Run the ordering agent to refresh.';

export const InventoryActionsCard = ({
  insight,
  loading = false,
  error,
  compact = false,
}: InventoryActionsCardProps) => {
  const normalized = useMemo(() => {
    if (!insight?.dataset || insight.dataset.length === 0) {
      return defaultSegments.map((segment) => ({
        label: segment.label,
        value: 0,
        color: segment.color,
      }));
    }
    return insight.dataset.map((segment, index) => ({
      label: segment.label,
      value: Number(segment.value) || 0,
      color: segment.color ?? defaultSegments[index % defaultSegments.length].color,
    }));
  }, [insight?.dataset]);

  const totalSkus = Number(insight?.totalSkus ?? 0) || 0;
  const hasData = normalized.some((segment) => segment.value > 0);
  const scenarioReady = insight?.scenarioAvailable ?? false;
  const maxValue = normalized.reduce((acc, segment) => Math.max(acc, segment.value), 0);

  const containerRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState<number>(200);
  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (!containerRef.current || !headerRef.current) return;
      const ch = containerRef.current.clientHeight || 0;
      const hh = headerRef.current.clientHeight || 0;
      setBodyHeight(Math.max(ch - hh - 24, 120));
    }) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    if (ro && headerRef.current) ro.observe(headerRef.current);
    return () => ro && ro.disconnect();
  }, []);

  return (
    <article
      className="gr-auto rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg"
      style={compact ? { height: 340, display: 'flex', flexDirection: 'column' } : { height: 'auto', display: 'block' }}
      ref={(el) => (containerRef.current = el)}
    >
      <header className="mb-2 flex flex-col gap-1" ref={(el) => (headerRef.current = el)}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Inventory actions
        </p>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-100">
            {hasData ? 'Prioritized SKU guidance' : 'Inventory steady'}
          </h3>
          {scenarioReady ? (
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Scenario ready
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-400">
          Highlights SKUs with reorder urgency, watch lists, and healthy buffers.
        </p>
      </header>

      <div className="mt-2 flex flex-col gap-3" style={compact ? { flex: 1, minHeight: 0 } : {}}>
        {loading ? (
          <span className="text-xs text-slate-500" aria-live="polite">
            Loading inventory insights…
          </span>
        ) : !hasData ? (
          <p className="text-sm text-slate-500">{error ?? emptyFallback}</p>
        ) : null}

        <ul className="flex flex-col gap-2" style={compact ? { maxHeight: bodyHeight, overflow: 'hidden' } : undefined}>
          {normalized.slice(0, compact ? Math.max(1, Math.floor(bodyHeight / 32)) : normalized.length).map((segment) => {
            const width =
              maxValue > 0
                ? segment.value > 0
                  ? Math.max((segment.value / maxValue) * 100, 10)
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
                  <span className="font-medium">{segment.value.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{ width: `${width}%`, backgroundColor: segment.color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {compact ? (
          normalized.length > Math.max(1, Math.floor(bodyHeight / 32)) ? (
            <div className="mt-1 text-right text-xs text-slate-400">+ View all</div>
          ) : null
        ) : (
          <footer className="text-xs text-slate-500">
            Tracking {totalSkus.toLocaleString()} SKU{totalSkus === 1 ? '' : 's'} across the forecast.
          </footer>
        )}
      </div>
    </article>
  );
};

export default InventoryActionsCard;
