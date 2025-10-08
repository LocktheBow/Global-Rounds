import { formatISO } from 'date-fns';
import { getSeedData } from '../db/store';
import type {
  EventRecord,
  OrderRecord,
  SeedData,
  SupplierRecord,
} from '../db/types';

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  category?: string;
  deviceType?: string;
  supplierId?: string;
  region?: string;
  riskLevel?: 'all' | 'low' | 'medium' | 'high';
}

export interface RevenueByCategoryDatum {
  date: string;
  category: string;
  revenue: number;
  anomalyScore?: number;
  anomalyReason?: string;
}

export interface SupplierReliabilityDatum {
  supplierId: string;
  supplierName: string;
  onTimePct: number;
  disputeRate: number;
  defectRate: number;
  region: string;
  category: string;
}

export interface AnalyticsSummaryResponse {
  revenueByCategory: RevenueByCategoryDatum[];
  supplierReliability: SupplierReliabilityDatum[];
  metadata: { lastUpdated: string };
}

const withinRange = (value: string, from?: string, to?: string) => {
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
};

const supplierMatchesFilters = (supplier: SupplierRecord, filters: AnalyticsFilters) => {
  if (filters.supplierId && supplier.id !== filters.supplierId) return false;
  if (filters.category && !supplier.categories.includes(filters.category)) return false;
  if (filters.deviceType && !supplier.deviceTypes.includes(filters.deviceType)) return false;
  if (filters.region && supplier.region !== filters.region) return false;
  if (filters.riskLevel && filters.riskLevel !== 'all' && supplier.riskLevel !== filters.riskLevel) {
    return false;
  }
  return true;
};

const buildOrderFilter = (
  data: SeedData,
  filters: AnalyticsFilters,
): ((order: OrderRecord) => boolean) => {
  const supplierMap = new Map(data.suppliers.map((supplier) => [supplier.id, supplier] as const));
  return (order: OrderRecord) => {
    if (!withinRange(order.date, filters.from, filters.to)) return false;
    if (filters.category && order.category !== filters.category) return false;
    if (filters.deviceType && order.deviceType !== filters.deviceType) return false;
    if (filters.supplierId && order.supplierId !== filters.supplierId) return false;
    if (filters.region && order.buyerRegion !== filters.region) return false;
    const supplier = supplierMap.get(order.supplierId);
    if (!supplier) return false;
    return supplierMatchesFilters(supplier, filters);
  };
};

const calculateAnomalies = (
  revenueMap: Map<string, Map<string, number>>,
): RevenueByCategoryDatum[] => {
  const anomalies: RevenueByCategoryDatum[] = [];
  revenueMap.forEach((dateMap, category) => {
    const values = Array.from(dateMap.values());
    if (values.length === 0) return;
    const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
    const variance =
      values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / Math.max(values.length - 1, 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return;
    dateMap.forEach((revenue, date) => {
      const z = (revenue - mean) / stdDev;
      if (Math.abs(z) >= 2) {
        anomalies.push({
          date,
          category,
          revenue,
          anomalyScore: Number(z.toFixed(2)),
          anomalyReason: z > 0 ? 'Above rolling mean' : 'Below rolling mean',
        });
      }
    });
  });
  return anomalies
    .sort((a, b) => Math.abs((b.anomalyScore ?? 0)) - Math.abs((a.anomalyScore ?? 0)))
    .slice(0, 3);
};

const buildRevenueByCategory = (
  orders: OrderRecord[],
  anomalies: RevenueByCategoryDatum[],
): RevenueByCategoryDatum[] => {
  const anomalyKey = new Set(anomalies.map((entry) => `${entry.date}|${entry.category}`));
  const results: RevenueByCategoryDatum[] = [];

  const grouped = new Map<string, Map<string, number>>();
  orders.forEach((order) => {
    const dateMap = grouped.get(order.date) ?? new Map<string, number>();
    const revenue = dateMap.get(order.category) ?? 0;
    const orderRevenue = order.qty * order.unitPrice;
    dateMap.set(order.category, revenue + orderRevenue);
    grouped.set(order.date, dateMap);
  });

  grouped.forEach((categoryMap, date) => {
    categoryMap.forEach((revenue, category) => {
      const key = `${date}|${category}`;
      const anomaly = anomalies.find((entry) => `${entry.date}|${entry.category}` === key);
      results.push({
        date,
        category,
        revenue: Number(revenue.toFixed(2)),
        anomalyScore: anomaly?.anomalyScore,
        anomalyReason: anomaly?.anomalyReason,
      });
    });
  });

  return results.sort((a, b) => (a.date === b.date ? a.category.localeCompare(b.category) : a.date.localeCompare(b.date)));
};

const computeSupplierReliability = (
  data: SeedData,
  orders: OrderRecord[],
  filters: AnalyticsFilters,
): SupplierReliabilityDatum[] => {
  const supplierMap = new Map(data.suppliers.map((supplier) => [supplier.id, supplier] as const));
  const orderStats = new Map<
    string,
    { total: number; onTime: number; totalLead: number; disputes: number; primaryCategory: string }
  >();

  const disputesByOrder = new Map<string, number>();
  data.events
    .filter((event) => event.type === 'dispute_filed')
    .forEach((event: EventRecord) => {
      const orderId = String(event.payload.orderId ?? '');
      if (!orderId) return;
      disputesByOrder.set(orderId, (disputesByOrder.get(orderId) ?? 0) + 1);
    });

  orders.forEach((order) => {
    const supplier = supplierMap.get(order.supplierId);
    if (!supplier) return;
    const stats =
      orderStats.get(order.supplierId) ?? {
        total: 0,
        onTime: 0,
        totalLead: 0,
        disputes: 0,
        primaryCategory: supplier.categories[0] ?? order.category,
      };
    stats.total += 1;
    stats.totalLead += order.leadTimeDays;
    if (order.leadTimeDays <= 7) {
      stats.onTime += 1;
    }
    if (disputesByOrder.get(order.id)) {
      stats.disputes += 1;
    }
    stats.primaryCategory = order.category;
    orderStats.set(order.supplierId, stats);
  });

  const suppliers = data.suppliers.filter((supplier) => supplierMatchesFilters(supplier, filters));

  return suppliers
    .map((supplier) => {
      const stats = orderStats.get(supplier.id);
      if (!stats || stats.total === 0) {
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          onTimePct: Number(supplier.onTimePct.toFixed(3)),
          disputeRate: Number(supplier.disputeRate.toFixed(3)),
          defectRate: Number(supplier.defectRate.toFixed(3)),
          region: supplier.region,
          category: supplier.categories[0] ?? 'Mixed',
        };
      }
      const disputeRate = Math.max(stats.disputes / stats.total, 0);
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        onTimePct: Number((stats.onTime / stats.total).toFixed(3)),
        disputeRate: Number(disputeRate.toFixed(3)),
        defectRate: Number(supplier.defectRate.toFixed(3)),
        region: supplier.region,
        category: stats.primaryCategory,
      };
    })
    .sort((a, b) => b.onTimePct - a.onTimePct);
};

export const getAnalyticsSummary = (filters: AnalyticsFilters): AnalyticsSummaryResponse => {
  const data = getSeedData();
  const filterFn = buildOrderFilter(data, filters);
  const filteredOrders = data.orders.filter(filterFn);

  const revenueMap = new Map<string, Map<string, number>>();
  filteredOrders.forEach((order) => {
    const categoryMap = revenueMap.get(order.category) ?? new Map<string, number>();
    const existing = categoryMap.get(order.date) ?? 0;
    categoryMap.set(order.date, existing + order.qty * order.unitPrice);
    revenueMap.set(order.category, categoryMap);
  });

  const anomalies = calculateAnomalies(revenueMap);
  const revenueByCategory = buildRevenueByCategory(filteredOrders, anomalies);
  const supplierReliability = computeSupplierReliability(data, filteredOrders, filters);

  return {
    revenueByCategory,
    supplierReliability,
    metadata: { lastUpdated: formatISO(new Date()) },
  };
};

export const parseAnalyticsFilters = (query: Record<string, unknown>): AnalyticsFilters => {
  const filters: AnalyticsFilters = {};
  if (typeof query.from === 'string' && query.from.trim()) filters.from = query.from;
  if (typeof query.to === 'string' && query.to.trim()) filters.to = query.to;
  if (typeof query.category === 'string' && query.category.trim()) filters.category = query.category;
  if (typeof query.deviceType === 'string' && query.deviceType.trim()) filters.deviceType = query.deviceType;
  if (typeof query.supplierId === 'string' && query.supplierId.trim()) filters.supplierId = query.supplierId;
  if (typeof query.region === 'string' && query.region.trim()) filters.region = query.region;
  if (typeof query.riskLevel === 'string' && query.riskLevel.trim()) {
    const value = query.riskLevel as AnalyticsFilters['riskLevel'];
    if (['all', 'low', 'medium', 'high'].includes(value ?? '')) {
      filters.riskLevel = value;
    }
  }
  return filters;
};
