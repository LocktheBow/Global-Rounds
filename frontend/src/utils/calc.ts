export interface RevenueByCategoryDatum {
  date: string; // ISO date string
  category: string;
  revenue: number;
  anomalyScore?: number;
  anomalyReason?: string;
}

export interface RevenueSeries {
  dates: string[];
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
  totals: number[];
  anomalies: RevenueAnomaly[];
}

export interface RevenueAnomaly {
  date: string;
  category: string;
  magnitude: number;
  score: number;
  reason?: string;
}

export interface SupplierReliabilityDatum {
  supplierId: string;
  supplierName: string;
  onTimePct: number; // 0-1
  disputeRate: number; // 0-1
  defectRate: number; // 0-1
  region: string;
  category: string;
}

export interface SupplierSeries {
  suppliers: SupplierReliabilityDatum[];
}

export interface AnalyticsSummaryResponse {
  revenueByCategory: RevenueByCategoryDatum[];
  supplierReliability: SupplierReliabilityDatum[];
  metadata: {
    lastUpdated: string;
  };
}

const sortIsoAsc = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const buildRevenueSeries = (rows: RevenueByCategoryDatum[]): RevenueSeries => {
  const dates = Array.from(new Set(rows.map((row) => row.date))).sort(sortIsoAsc);
  const categories = Array.from(new Set(rows.map((row) => row.category))).sort();

  const indexByDate = new Map(dates.map((date, idx) => [date, idx] as const));

  const seriesMap = new Map<string, number[]>(
    categories.map((category) => [category, new Array(dates.length).fill(0)] as const),
  );

  const anomalies: RevenueAnomaly[] = [];

  for (const row of rows) {
    const dateIndex = indexByDate.get(row.date);
    if (dateIndex === undefined) continue;
    const bucket = seriesMap.get(row.category);
    if (!bucket) continue;
    bucket[dateIndex] += row.revenue;
    if (row.anomalyScore !== undefined) {
      anomalies.push({
        date: row.date,
        category: row.category,
        magnitude: row.revenue,
        score: row.anomalyScore,
        reason: row.anomalyReason,
      });
    }
  }

  const totals = dates.map((_, idx) => {
    let sum = 0;
    for (const category of categories) {
      sum += seriesMap.get(category)?.[idx] ?? 0;
    }
    return sum;
  });

  return {
    dates,
    categories,
    series: categories.map((category) => ({
      name: category,
      data: seriesMap.get(category) ?? [],
    })),
    totals,
    anomalies: anomalies
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 3),
  };
};

export const buildSupplierSeries = (
  rows: SupplierReliabilityDatum[],
  focusedSupplierId?: string | null,
): SupplierSeries => {
  const suppliers = [...rows].sort((a, b) => b.onTimePct - a.onTimePct);

  if (focusedSupplierId) {
    suppliers.sort((a, b) => {
      if (a.supplierId === focusedSupplierId) return -1;
      if (b.supplierId === focusedSupplierId) return 1;
      return b.onTimePct - a.onTimePct;
    });
  }

  return { suppliers };
};
