import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { CommandFinanceInsight } from '../../types/command';

export interface RailFinanceMiniProps {
  insight: CommandFinanceInsight | null;
  loading?: boolean;
}

export const RailFinanceMini = ({ insight, loading = false }: RailFinanceMiniProps) => {
  const rows = insight?.dataset ?? [];
  const hasData = rows.some((r) => Number(r.value) > 0);

  const option = useMemo<EChartsOption>(() => {
    const labels = rows.map((r) => r.label);
    const values = rows.map((r) => Number(r.value) || 0);
    const colors = rows.map((r, i) => r.color || ['#22d3ee', '#38bdf8', '#facc15'][i % 3]);
    const max = Math.max(...values, 1);
    return {
      aria: { enabled: true },
      grid: { left: 120, right: 16, top: 24, bottom: 36 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#cbd5f5', formatter: (v: number) => `${v.toLocaleString()}` },
        splitLine: { lineStyle: { color: '#1e293b' } },
        max,
      },
      yAxis: { type: 'category', inverse: true, data: labels, axisLabel: { color: '#cbd5f5' } },
      tooltip: { trigger: 'item', valueFormatter: (v: number) => v.toLocaleString() },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
          barWidth: 16,
        },
      ],
    } satisfies EChartsOption;
  }, [rows]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <header className="mb-2">
        <h3 className="text-sm font-semibold text-slate-200">Finance Pulse</h3>
        <p className="text-xs text-slate-500">Bars for labor, cash, and DSO.</p>
      </header>
      {loading ? (
        <div className="text-xs text-slate-500">Loading…</div>
      ) : hasData ? (
        <ReactECharts option={option} notMerge lazyUpdate style={{ height: 260 }} />
      ) : (
        <div className="text-xs text-slate-500">No measurable impact yet</div>
      )}
    </section>
  );
};

export default RailFinanceMini;
