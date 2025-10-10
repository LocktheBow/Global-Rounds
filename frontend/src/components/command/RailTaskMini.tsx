import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { CommandTaskInsight } from '../../types/command';

export interface RailTaskMiniProps {
  insight: CommandTaskInsight | null;
  loading?: boolean;
}

export const RailTaskMini = ({ insight, loading = false }: RailTaskMiniProps) => {
  const dataset = insight?.dataset ?? [];
  const hasData = dataset.some((d) => Number(d.value) > 0);

  const option = useMemo<EChartsOption>(() => {
    const items = (dataset || [])
      .filter((d) => Number(d.value) > 0)
      .map((d) => ({ value: Number(d.value) || 0, name: d.label, itemStyle: d.color ? { color: d.color } : undefined }));
    return {
      aria: { enabled: true, decal: { show: false } },
      tooltip: { trigger: 'item', valueFormatter: (v) => `${Number(v).toLocaleString()} tasks` },
      series: [
        {
          name: 'Tasks by status',
          type: 'pie',
          radius: ['52%', '78%'],
          center: ['50%', '50%'],
          label: { show: false },
          itemStyle: { borderColor: '#020617', borderWidth: 2 },
          data: items,
        },
      ],
    } satisfies EChartsOption;
  }, [dataset]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <header className="mb-2">
        <h3 className="text-sm font-semibold text-slate-200">Unified Queue</h3>
        <p className="text-xs text-slate-500">Distribution across open, in-progress, and closed.</p>
      </header>
      {loading ? (
        <div className="text-xs text-slate-500">Loading…</div>
      ) : hasData ? (
        <ReactECharts option={option} notMerge lazyUpdate style={{ height: 240 }} />
      ) : (
        <div className="text-xs text-slate-500">No active tasks</div>
      )}
    </section>
  );
};

export default RailTaskMini;

