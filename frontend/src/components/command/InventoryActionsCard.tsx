import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { CommandInsightsResponse } from '../../types/command';

interface InventoryActionsCardProps {
  insight: CommandInsightsResponse['inventory'] | null;
  loading?: boolean;
  error?: string | null;
}

const buildOption = (insight: CommandInsightsResponse['inventory']) => {
  const dataset = insight.dataset;
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        if (!params.length) return '';
        const bar = dataset[params[0].dataIndex];
        return `${bar.label}<br/>${bar.value} SKU${bar.value === 1 ? '' : 's'}`;
      },
    },
    grid: { left: 140, right: 24, top: 24, bottom: 16 },
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
        data: dataset.map((segment) => ({ value: segment.value, itemStyle: { color: segment.color } })),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => dataset[params.dataIndex].value,
          color: '#e2e8f0',
          fontWeight: 500,
        },
      },
    ],
  };
};

export const InventoryActionsCard: React.FC<InventoryActionsCardProps> = ({ insight, loading, error }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Inventory Actions</h3>
        <p className="mt-4 text-sm text-slate-400">Loading inventory response…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Inventory Actions</h3>
        <p className="mt-4 text-sm text-rose-400">{error}</p>
      </div>
    );
  }

  if (!insight || !insight.dataset.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Inventory Actions</h3>
        <p className="mt-4 text-sm text-slate-400">No active recommendations. Run the ordering agent to refresh.</p>
      </div>
    );
  }

  const option = buildOption(insight);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Inventory Actions</h3>
          <p className="mt-1 text-base font-semibold text-slate-100">Recommended responses</p>
        </div>
      </div>
      <div className="mt-4" style={{ height: 300 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge opts={{ renderer: 'svg' }} />
      </div>
      <p className="mt-4 text-sm text-slate-400">Tracking {insight.totalSkus} SKU{insight.totalSkus === 1 ? '' : 's'} across the forecast.</p>
    </div>
  );
};

export default InventoryActionsCard;
