import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { buildRevenueSeries, type RevenueByCategoryDatum } from '../../utils/calc';

export interface RailRevenueMiniProps {
  data: RevenueByCategoryDatum[];
  loading?: boolean;
}

const palette = ['#16a34a', '#22d3ee', '#fde047', '#f97316', '#a855f7', '#f43f5e', '#38bdf8'];

export const RailRevenueMini = ({ data, loading = false }: RailRevenueMiniProps) => {
  const { dates, series } = useMemo(() => buildRevenueSeries(data), [data]);

  const option = useMemo<EChartsOption>(() => {
    return {
      aria: { enabled: true },
      color: palette,
      grid: { left: 40, right: 16, top: 24, bottom: 32 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        valueFormatter: (value: number) => `$${value.toLocaleString()}`,
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLabel: { color: '#94a3b8', formatter: (value: string) => value.slice(5) },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', formatter: (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}` },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: series.map((entry) => ({
        name: entry.name,
        type: 'line',
        stack: 'revenue-mini',
        areaStyle: { opacity: 0.28 },
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        data: entry.data,
      })),
    } satisfies EChartsOption;
  }, [dates, series]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <header className="mb-2">
        <h3 className="text-sm font-semibold text-slate-200">Revenue by Category</h3>
        <p className="text-xs text-slate-500">Stacked area over time (mini)</p>
      </header>
      {loading ? (
        <div className="text-xs text-slate-500">Loading…</div>
      ) : (
        <ReactECharts option={option} notMerge lazyUpdate style={{ height: 220 }} />
      )}
    </section>
  );
};

export default RailRevenueMini;

