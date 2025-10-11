import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { CommandInsightsResponse } from '../../types/command';

interface FinancePulseCardProps {
  insight: CommandInsightsResponse['finance'] | null;
  loading?: boolean;
  error?: string | null;
}

const buildOption = (insight: CommandInsightsResponse['finance']) => {
  const dataset = insight.dataset;
  const values = dataset.map((segment) => ({
    value: segment.value,
    itemStyle: { color: segment.color },
    displayValue: segment.displayValue,
  }));

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        if (!params.length) return '';
        const item = dataset[params[0].dataIndex];
        return `${item.label}<br/>${item.displayValue}`;
      },
    },
    // Add more right padding to avoid clipping long labels like "Projected cash"
    grid: { left: 160, right: 120, top: 24, bottom: 16, containLabel: false },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#64748b' } },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: dataset.map((segment) => segment.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#e2e8f0' },
    },
    series: [
      {
        type: 'bar',
        barWidth: 18,
        data: values,
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => dataset[params.dataIndex].displayValue,
          color: '#e2e8f0',
          fontWeight: 500,
        },
      },
    ],
  };
};

export const FinancePulseCard: React.FC<FinancePulseCardProps> = ({ insight, loading, error }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Finance Pulse</h3>
        <p className="mt-4 text-sm text-slate-400">Refreshing performance metrics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Finance Pulse</h3>
        <p className="mt-4 text-sm text-rose-400">{error}</p>
      </div>
    );
  }

  if (!insight || !insight.dataset.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Finance Pulse</h3>
        <p className="mt-4 text-sm text-slate-400">Run the finance agent to populate ROI metrics.</p>
      </div>
    );
  }

  const option = buildOption(insight);
  const snapshotCopy = insight.meta.snapshotDate
    ? `As of ${new Date(insight.meta.snapshotDate).toLocaleDateString()}`
    : `DSO baseline ${insight.meta.baselineDso} days`;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Finance Pulse</h3>
          <p className="mt-1 text-base font-semibold text-slate-100">Automation impact</p>
        </div>
      </div>
      <div className="mt-4" style={{ height: 300 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge opts={{ renderer: 'svg' }} />
      </div>
      <p className="mt-4 text-sm text-slate-400">{snapshotCopy}</p>
    </div>
  );
};

export default FinancePulseCard;
