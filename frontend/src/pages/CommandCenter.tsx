import { useCallback, useEffect, useMemo, useState } from 'react';
import { RevenueByCategory } from '../components/dashboards/RevenueByCategory';
import { SupplierReliability } from '../components/dashboards/SupplierReliability';
import { useCommandFilters, buildFilterQuery } from '../state/filters';
import { AnalyticsSummaryResponse } from '../utils/calc';

export const CommandCenter = () => {
  const { filters, setFilters, resetFilters } = useCommandFilters();
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiBase = useMemo(() => {
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }, []);

  useEffect(() => {
    document.title = 'Global Rounds Command Center';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(buildFilterQuery(filters));
        const url = `${apiBase}/api/analytics/summary${
          params.toString() ? `?${params.toString()}` : ''
        }`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load analytics (${response.status})`);
        }
        const payload = (await response.json()) as AnalyticsSummaryResponse;
        setSummary(payload);
      } catch (cause) {
        if ((cause as Error).name === 'AbortError') return;
        setError((cause as Error).message ?? 'Unable to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
    return () => controller.abort();
  }, [apiBase, filters]);

  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters({
      timeRange: {
        ...filters.timeRange,
        [name]: value ? value : null,
      },
    });
  };

  const handleSelectChange = (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setFilters({ [name]: value || null } as Partial<typeof filters>);
  };

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      setFilters({ category });
    },
    [setFilters],
  );

  const handleSupplierSelect = useCallback(
    (supplierId: string | null) => {
      setFilters({ supplierId });
    },
    [setFilters],
  );

  const handleTimeBrush = useCallback(
    (from: string | null, to: string | null) => {
      setFilters({ timeRange: { from, to } });
    },
    [setFilters],
  );

  const revenueData = summary?.revenueByCategory ?? [];
  const supplierData = summary?.supplierReliability ?? [];

  const lastUpdatedCopy = useMemo(() => summary?.metadata.lastUpdated ?? null, [summary]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-2xl font-semibold">Global Rounds Command Center</h1>
            <p className="text-sm text-slate-400">
              Monitor sales, inventory, supplier resilience, and compliance in one view.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            {lastUpdatedCopy ? (
              <span
                aria-live="polite"
                className="rounded-full border border-slate-700 px-3 py-1 text-xs"
              >
                Last sync: {new Date(lastUpdatedCopy).toLocaleString()}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => resetFilters()}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <section className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                From
              </label>
              <input
                type="date"
                name="from"
                value={filters.timeRange.from ?? ''}
                onChange={handleRangeChange}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                To
              </label>
              <input
                type="date"
                name="to"
                value={filters.timeRange.to ?? ''}
                onChange={handleRangeChange}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                Category
              </label>
              <input
                name="category"
                placeholder="All"
                onChange={handleSelectChange}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={filters.category ?? ''}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                Device Type
              </label>
              <input
                name="deviceType"
                placeholder="All"
                onChange={handleSelectChange}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={filters.deviceType ?? ''}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                Supplier
              </label>
              <input
                name="supplierId"
                placeholder="All"
                onChange={handleSelectChange}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={filters.supplierId ?? ''}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                Region
              </label>
              <input
                name="region"
                placeholder="All"
                onChange={handleSelectChange}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={filters.region ?? ''}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                Risk Level
              </label>
              <select
                name="riskLevel"
                onChange={handleSelectChange}
                value={filters.riskLevel}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-600/50 bg-rose-950/40 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueByCategory
              data={revenueData}
              loading={isLoading}
              focusedCategory={filters.category}
              onSelectCategory={handleCategorySelect}
              onBrushRange={handleTimeBrush}
            />
          </div>
          <div>
            <SupplierReliability
              data={supplierData}
              loading={isLoading}
              focusedSupplierId={filters.supplierId}
              onSelectSupplier={handleSupplierSelect}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommandCenter;
