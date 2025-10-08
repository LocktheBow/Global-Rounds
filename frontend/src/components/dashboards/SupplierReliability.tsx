import { useMemo, useCallback } from 'react';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import {
  SupplierReliabilityDatum,
  buildSupplierSeries,
} from '../../utils/calc';

interface SupplierReliabilityProps {
  data: SupplierReliabilityDatum[];
  focusedSupplierId?: string | null;
  loading?: boolean;
  onSelectSupplier?: (supplierId: string | null) => void;
}

const riskColor = (disputeRate: number) => {
  if (disputeRate >= 0.1) return '#f87171';
  if (disputeRate >= 0.05) return '#fb923c';
  return '#34d399';
};

export const SupplierReliability = ({
  data,
  focusedSupplierId,
  loading = false,
  onSelectSupplier,
}: SupplierReliabilityProps) => {
  const supplierSeries = useMemo(
    () => buildSupplierSeries(data, focusedSupplierId),
    [data, focusedSupplierId],
  );

  const topSuppliers = supplierSeries.suppliers.slice(0, 12);

  const option = useMemo<EChartsOption>(() => {
    return {
      aria: { enabled: true },
      grid: { left: 130, right: 24, top: 40, bottom: 40 },
      tooltip: {
        trigger: 'item',
        valueFormatter: (value: number) => `${(value * 100).toFixed(1)}%`,
        formatter: (params: any) => {
          const supplier = topSuppliers[params.dataIndex];
          if (!supplier) return params.name;
          return [
            `<strong>${supplier.supplierName}</strong>`,
            `On-time: ${(supplier.onTimePct * 100).toFixed(1)}%`,
            `Disputes: ${(supplier.disputeRate * 100).toFixed(1)}%`,
            `Defects: ${(supplier.defectRate * 100).toFixed(1)}%`,
            `Region: ${supplier.region}`,
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'value',
        max: 1,
        axisLabel: {
          formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
          color: '#cbd5f5',
        },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: topSuppliers.map((supplier) => supplier.supplierName),
        axisLabel: {
          color: (value: string) => (
            supplierSeries.suppliers.find((row) => row.supplierName === value)?.supplierId ===
            focusedSupplierId
              ? '#38bdf8'
              : '#cbd5f5'
          ),
        },
      },
      series: [
        {
          name: 'On-Time %',
          type: 'bar',
          data: topSuppliers.map((supplier) => ({
            value: supplier.onTimePct,
            itemStyle: {
              color:
                focusedSupplierId && supplier.supplierId === focusedSupplierId
                  ? '#38bdf8'
                  : riskColor(supplier.disputeRate),
            },
          })),
          barWidth: 16,
          emphasis: { focus: 'series' },
        },
        {
          name: 'Dispute Rate',
          type: 'pictorialBar',
          symbol: 'rect',
          symbolSize: [2, 16],
          symbolOffset: [10, 0],
          data: topSuppliers.map((supplier) => ({
            value: supplier.disputeRate,
            itemStyle: { color: '#f97316' },
          })),
          tooltip: {
            valueFormatter: (value: number) => `${(value * 100).toFixed(1)}% disputes`,
          },
        },
      ],
    } satisfies EChartsOption;
  }, [focusedSupplierId, supplierSeries.suppliers, topSuppliers]);

  const handleClick = useCallback(
    (params: { dataIndex: number }) => {
      const supplier = topSuppliers[params.dataIndex];
      if (!supplier) return;
      const nextValue =
        focusedSupplierId && focusedSupplierId === supplier.supplierId ? null : supplier.supplierId;
      onSelectSupplier?.(nextValue);
    },
    [focusedSupplierId, onSelectSupplier, topSuppliers],
  );

  const onEvents = useMemo(() => ({ click: handleClick }), [handleClick]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Supplier Reliability</h2>
          <p className="text-xs text-slate-400">
            Click a supplier to focus. Bars show on-time %, markers show dispute rate.
          </p>
        </div>
        {loading ? (
          <span className="animate-pulse text-xs text-slate-500" aria-live="polite">
            Loading…
          </span>
        ) : null}
      </header>
      {topSuppliers.length === 0 ? (
        <div className="rounded-md border border-slate-800 bg-slate-950/80 p-6 text-center text-sm text-slate-400">
          No suppliers match the current filters.
        </div>
      ) : (
        <ReactECharts option={option} notMerge lazyUpdate onEvents={onEvents} style={{ height: 300 }} />
      )}
    </section>
  );
};

export default SupplierReliability;
