import { useEffect, useMemo, useRef } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { CommandTaskInsight } from '../../types/command';

interface TaskLoadCardProps {
  insight: CommandTaskInsight | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

const emptyFallback = 'Run the agents to populate the unified queue.';

export const TaskLoadCard = ({ insight, loading = false, error, compact = false }: TaskLoadCardProps) => {
  const fallbackSegments = [
    { label: 'Open', value: 0, color: '#38bdf8' },
    { label: 'In Progress', value: 0, color: '#22d3ee' },
    { label: 'Closed', value: 0, color: '#14b8a6' },
  ];
  const rawDataset = insight?.dataset ?? [];
  const normalizedDataset =
    rawDataset.length > 0
      ? rawDataset.map((segment, index) => ({
          label: segment.label,
          value: Number(segment.value) || 0,
          color: segment.color ?? fallbackSegments[index % fallbackSegments.length].color,
        }))
      : [];
  const segmentsForDisplay = normalizedDataset.length > 0 ? normalizedDataset : fallbackSegments;
  const total = Number(insight?.total ?? 0) || 0;
  const slaBreaches = Number(insight?.slaBreaches ?? 0) || 0;
  const usable = normalizedDataset.filter((segment) => segment.value > 0);
  const hasData = usable.length > 0;

  const option = useMemo<EChartsOption | null>(() => {
    if (!hasData) return null;
    return {
      aria: { enabled: true, decal: { show: false } },
      tooltip: {
        trigger: 'item',
        valueFormatter: (value) => `${Number(value).toLocaleString()} tasks`,
      },
      series: [
        {
          name: 'Tasks by status',
          type: 'pie',
          radius: ['50%', '78%'],
          center: ['50%', '52%'],
          avoidLabelOverlap: false,
          label: { show: false },
          itemStyle: {
            borderColor: '#020617',
            borderWidth: 2,
          },
          data: usable.map((segment) => ({
            value: segment.value,
            name: segment.label,
            itemStyle: segment.color ? { color: segment.color } : undefined,
          })),
        },
      ],
    } satisfies EChartsOption;
  }, [hasData, usable]);

  const chartRef = useRef<any | null>(null);
  const handleChartReady = (instance: any) => {
    chartRef.current = instance;
    try {
      requestAnimationFrame(() => instance.resize());
      window.setTimeout(() => instance.resize(), 100);
    } catch {}
  };

  useEffect(() => {
    const onResize = () => {
      try {
        if (chartRef.current) chartRef.current.resize();
      } catch {}
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const badgeCopy = useMemo(() => {
    if (slaBreaches <= 0) return null;
    return slaBreaches === 1 ? '1 SLA at risk' : `${slaBreaches} SLAs at risk`;
  }, [slaBreaches]);

  return (
    <article
      className="gr-auto rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg"
      style={compact ? { height: 'auto', display: 'block', maxHeight: 340 } : { height: 'auto', display: 'block' }}
    >
      <header className="mb-2 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Unified queue
        </p>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-100">
            {total > 0 ? `${total.toLocaleString()} tasks` : 'No active tasks'}
          </h3>
          {badgeCopy ? (
            <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
              {badgeCopy}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-400">
          Live workload distribution across open, in-progress, and closed efforts.
        </p>
      </header>

      <div className="mt-2 flex flex-col gap-3" style={{ height: 'auto' }}>
        <div>
          {loading ? (
            <span className="text-xs text-slate-500" aria-live="polite">
              Loading task insights…
            </span>
          ) : hasData && option ? (
            <ReactECharts
              option={option}
              notMerge
              lazyUpdate
              onChartReady={handleChartReady}
              style={{ height: compact ? 200 : 220, width: '100%' }}
            />
          ) : (
            <p className="text-center text-sm text-slate-500">
              {error ?? emptyFallback}
            </p>
          )}
        </div>

        {!compact ? (
          <ul className="grid gap-2 text-sm text-slate-300">
          {segmentsForDisplay.map((segment) => (
            <li key={segment.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color ?? '#38bdf8' }}
                  aria-hidden
                />
                {segment.label}
              </span>
              <span className="font-medium">{segment.value.toLocaleString()}</span>
            </li>
          ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
};

export default TaskLoadCard;
