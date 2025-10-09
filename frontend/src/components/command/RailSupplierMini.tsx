import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { buildSupplierSeries, type SupplierReliabilityDatum } from '../../utils/calc';

export interface RailSupplierMiniProps {
  data: SupplierReliabilityDatum[];
  loading?: boolean;
}

const riskColor = (disputeRate: number) => {
  if (disputeRate >= 0.1) return '#f87171';
  if (disputeRate >= 0.05) return '#fb923c';
  return '#34d399';
};

export const RailSupplierMini = ({ data, loading = false }: RailSupplierMiniProps) => {
  const seriesData = useMemo(() => buildSupplierSeries(data, null), [data]);
  const topSuppliers = seriesData.suppliers.slice(0, 8);

  const option = useMemo<EChartsOption>(() => {
    return {
      aria: { enabled: true },
      grid: { left: 120, right: 16, top: 24, bottom: 24 },
      tooltip: {
        trigger: 'item',
        valueFormatter: (value: number) => `${(value * 100).toFixed(1)}%`,
      },
      xAxis: {
        type: 'value',
        max: 1,
        axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%`, color: '#cbd5f5' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: topSuppliers.map((s) => s.supplierName),
        axisLabel: { color: '#cbd5f5' },
      },
      series: [
        {
          name: 'On-Time %',
          type: 'bar',
          data: topSuppliers.map((s) => ({ value: s.onTimePct, itemStyle: { color: riskColor(s.disputeRate) } })),
          barWidth: 14,
          emphasis: { focus: 'series' },
        },
        {
          name: 'Dispute Rate',
          type: 'pictorialBar',
          symbol: 'rect',
          symbolSize: [2, 14],
          symbolOffset: [10, 0],
          data: topSuppliers.map((s) => ({ value: s.disputeRate, itemStyle: { color: '#f97316' } })),
        },
      ],
    } satisfies EChartsOption;
  }, [topSuppliers]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <header className="mb-2">
        <h3 className="text-sm font-semibold text-slate-200">Supplier Reliability</h3>
        <p className="text-xs text-slate-500">On-time % with dispute markers (mini)</p>
      </header>
      {loading ? (
        <div className="text-xs text-slate-500">Loading…</div>
      ) : (
        <ReactECharts option={option} notMerge lazyUpdate style={{ height: 240 }} />
      )}
    </section>
  );
};

export default RailSupplierMini;

