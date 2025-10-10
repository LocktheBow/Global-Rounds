import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { CommandInventoryInsight } from '../../types/command';

export interface RailInventoryMiniProps {
  insight: CommandInventoryInsight | null;
  loading?: boolean;
}

export const RailInventoryMini = ({ insight, loading = false }: RailInventoryMiniProps) => {
  const rows = insight?.dataset ?? [];
  const hasData = rows.some((r) => Number(r.value) > 0);

  const option = useMemo<EChartsOption>(() => {
    const labels = rows.map((r) => r.label);
    const values = rows.map((r) => Number(r.value) || 0);
    const colors = rows.map((r, i) => r.color || ['#f97316', '#fb7185', '#22c55e'][i % 3]);
    const max = Math.max(...values, 1);
    return {
      aria: { enabled: true },
      grid: { left: 50, right: 16, top: 24, bottom: 52 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#cbd5f5' } },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#cbd5f5', formatter: (v: number) => `${v}` },
        splitLine: { lineStyle: { color: '#1e293b' } },
        max,
      },
      tooltip: { trigger: 'item', valueFormatter: (v: number) => `${v.toLocaleString()} SKUs` },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
          barWidth: 22,
        },
      ],
    } satisfies EChartsOption;
  }, [rows]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <header className="mb-2">
        <h3 className="text-sm font-semibold text-slate-200">Inventory Actions</h3>
        <p className="text-xs text-slate-500">Reorder, watch, and buffer counts.</p>
      </header>
      {loading ? (
        <div className="text-xs text-slate-500">Loading…</div>
      ) : hasData ? (
        <ReactECharts option={option} notMerge lazyUpdate style={{ height: 280 }} />
      ) : (
        <div className="text-xs text-slate-500">No active recommendations</div>
      )}
    </section>
  );
};

export default RailInventoryMini;
