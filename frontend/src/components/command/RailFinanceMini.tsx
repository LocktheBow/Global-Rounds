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
    const display = rows.map((r, i) => r.displayValue ?? (Number(r.value) || 0).toLocaleString());
    const max = Math.max(...values, 1);
    const normalized = values.map((v, i) => ({ value: (v / max) * 100, raw: display[i], color: colors[i] }));
    return {
      aria: { enabled: true },
      grid: { left: 140, right: 24, top: 24, bottom: 56 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#cbd5f5', formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: '#1e293b' } },
        max: 100,
      },
      yAxis: { type: 'category', inverse: true, data: labels, axisLabel: { color: '#cbd5f5' } },
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}: ${display[p.dataIndex]}`,
      },
      series: [
        {
          type: 'bar',
          data: normalized.map((n) => ({ value: n.value, itemStyle: { color: n.color }, raw: n.raw })),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            color: '#cbd5f5',
            formatter: (p: any) => p.data?.raw ?? '',
          },
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
        <ReactECharts option={option} notMerge lazyUpdate style={{ height: 280 }} />
      ) : (
        <div className="text-xs text-slate-500">No measurable impact yet</div>
      )}
    </section>
  );
};

export default RailFinanceMini;
