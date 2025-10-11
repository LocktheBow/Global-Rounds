import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { CommandInsightsResponse } from '../../types/command';

interface TaskLoadCardProps {
  insight: CommandInsightsResponse['tasks'] | null;
  loading?: boolean;
  error?: string | null;
}

const donutOption = (insight: CommandInsightsResponse['tasks']) => {
  const { dataset, total } = insight;
  const seriesData = dataset.map((segment) => ({
    value: segment.value,
    name: segment.label,
    itemStyle: { color: segment.color },
  }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${params.value} (${params.percent}%)`,
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '82%'],
        center: ['50%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: { show: false },
        data: seriesData,
      },
      {
        type: 'pie',
        radius: [0, '48%'],
        center: ['50%', '55%'],
        label: { show: false },
        itemStyle: { color: 'rgba(15, 23, 42, 0.85)' },
        data: [{ value: 1 }],
        silent: true,
        z: -1,
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '46%',
        style: {
          text: `${total}`,
          fill: '#e2e8f0',
          fontSize: 26,
          fontWeight: 600,
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '58%',
        style: {
          text: 'tasks',
          fill: '#94a3b8',
          fontSize: 13,
          fontWeight: 400,
        },
      },
    ],
  };
};

export const TaskLoadCard: React.FC<TaskLoadCardProps> = ({ insight, loading, error }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Task Load</h3>
        <p className="mt-4 text-sm text-slate-400">Loading task distribution…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Task Load</h3>
        <p className="mt-4 text-sm text-rose-400">{error}</p>
      </div>
    );
  }

  if (!insight || insight.total === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Task Load</h3>
        <p className="mt-4 text-sm text-slate-400">Run the agents to populate the unified queue.</p>
      </div>
    );
  }

  const option = donutOption(insight);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Task Load</h3>
          <p className="mt-1 text-base font-semibold text-slate-100">Unified queue status</p>
        </div>
        {insight.slaBreaches > 0 ? (
          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
            {insight.slaBreaches} SLA at risk
          </span>
        ) : null}
      </div>
      <div className="mt-4" style={{ height: 300 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge opts={{ renderer: 'svg' }} />
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {insight.dataset.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="flex-1">{segment.label}</span>
            <span className="font-semibold text-slate-100">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskLoadCard;
