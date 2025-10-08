import { useCallback, useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import {
  RevenueByCategoryDatum,
  buildRevenueSeries,
} from '../../utils/calc';

interface RevenueByCategoryProps {
  data: RevenueByCategoryDatum[];
  loading?: boolean;
  focusedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  onBrushRange?: (from: string | null, to: string | null) => void;
}

const palette = ['#16a34a', '#22d3ee', '#fde047', '#f97316', '#a855f7', '#f43f5e', '#38bdf8'];

export const RevenueByCategory = ({
  data,
  loading = false,
  focusedCategory,
  onSelectCategory,
  onBrushRange,
}: RevenueByCategoryProps) => {
  const revenueSeries = useMemo(() => buildRevenueSeries(data), [data]);
  const { dates, series, anomalies } = revenueSeries;

  const option = useMemo<EChartsOption>(() => {
    return {
      aria: { enabled: true },
      color: palette,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        valueFormatter: (value: number) => `$${value.toLocaleString()}`,
      },
      legend: {
        type: 'scroll',
        top: 10,
        selected: focusedCategory
          ? series.reduce<Record<string, boolean>>((acc, item) => {
              acc[item.name] = item.name === focusedCategory;
              return acc;
            }, {})
          : undefined,
      },
      grid: { left: 50, right: 24, top: 60, bottom: 60 },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', bottom: 12, height: 18 },
      ],
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLabel: { color: '#94a3b8', formatter: (value: string) => value.slice(5) },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#94a3b8',
          formatter: (value: number) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`,
        },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: series.map((entry, index) => ({
        name: entry.name,
        type: 'line',
        stack: 'total-revenue',
        areaStyle: { opacity: 0.35 },
        smooth: true,
        emphasis: { focus: 'series' },
        showSymbol: false,
        lineStyle: { width: focusedCategory && entry.name !== focusedCategory ? 1 : 2 },
        z: focusedCategory && entry.name === focusedCategory ? 5 : index,
        data: entry.data,
        markPoint:
          anomalies.length > 0
            ? {
                symbol: 'circle',
                symbolSize: 12,
                itemStyle: {
                  color: '#f97316',
                },
                data: anomalies
                  .filter((anomaly) => anomaly.category === entry.name)
                  .map((anomaly) => ({
                    coord: [anomaly.date, anomaly.magnitude],
                    value: `Spike (${anomaly.score.toFixed(1)})`,
                  })),
                label: {
                  formatter: (param: { value: string }) => param.value,
                  color: '#0f172a',
                },
              }
            : undefined,
      })),
    } satisfies EChartsOption;
  }, [anomalies, dates, focusedCategory, series]);

  const handleLegendSelect = useCallback(
    (params: { name: string; selected: Record<string, boolean> }) => {
      const isActive = params.selected?.[params.name] ?? true;
      onSelectCategory?.(isActive ? params.name : null);
    },
    [onSelectCategory],
  );

  const handleSeriesClick = useCallback(
    (params: { seriesName?: string }) => {
      if (!params.seriesName) return;
      onSelectCategory?.(
        focusedCategory && focusedCategory === params.seriesName ? null : params.seriesName,
      );
    },
    [focusedCategory, onSelectCategory],
  );

  const handleDataZoom = useCallback(
    (params: { batch?: Array<{ startValue?: number | string; endValue?: number | string }> }) => {
      if (!params.batch || params.batch.length === 0) return;
      const payload = params.batch[0];
      const startIndex =
        typeof payload.startValue === 'number'
          ? payload.startValue
          : payload.startValue
          ? dates.indexOf(String(payload.startValue))
          : 0;
      const endIndex =
        typeof payload.endValue === 'number'
          ? payload.endValue
          : payload.endValue
          ? dates.indexOf(String(payload.endValue))
          : dates.length - 1;
      if (startIndex < 0 || endIndex < 0) return;
      onBrushRange?.(dates[startIndex] ?? null, dates[endIndex] ?? null);
    },
    [dates, onBrushRange],
  );

  const onEvents = useMemo(
    () => ({
      legendselectchanged: handleLegendSelect,
      click: handleSeriesClick,
      datazoom: handleDataZoom,
    }),
    [handleDataZoom, handleLegendSelect, handleSeriesClick],
  );

  return (
    <section className="relative rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Revenue by Category</h2>
          <p className="text-xs text-slate-400">
            Stacked area showing daily revenue. Drag the brush to refine the global date range.
          </p>
        </div>
        {loading ? (
          <span className="animate-pulse text-xs text-slate-500" aria-live="polite">
            Loading…
          </span>
        ) : null}
      </header>
      <ReactECharts option={option} notMerge lazyUpdate onEvents={onEvents} style={{ height: 320 }} />
    </section>
  );
};

export default RevenueByCategory;
