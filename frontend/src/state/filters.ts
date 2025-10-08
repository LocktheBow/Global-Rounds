import { create } from 'zustand';

export type RiskLevel = 'all' | 'low' | 'medium' | 'high';

export interface TimeRange {
  from: string | null;
  to: string | null;
}

export interface CommandCenterFilters {
  timeRange: TimeRange;
  category: string | null;
  deviceType: string | null;
  supplierId: string | null;
  region: string | null;
  riskLevel: RiskLevel;
}

export interface FilterStore {
  filters: CommandCenterFilters;
  setFilters: (partial: Partial<CommandCenterFilters>) => void;
  setTimeRange: (range: TimeRange) => void;
  resetFilters: () => void;
}

export const createDefaultFilters = (): CommandCenterFilters => ({
  timeRange: { from: null, to: null },
  category: null,
  deviceType: null,
  supplierId: null,
  region: null,
  riskLevel: 'all',
});

export const useCommandFilters = create<FilterStore>((set) => ({
  filters: createDefaultFilters(),
  setFilters: (partial) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial,
        timeRange: partial.timeRange ?? state.filters.timeRange,
      },
    })),
  setTimeRange: (range) =>
    set((state) => ({
      filters: {
        ...state.filters,
        timeRange: range,
      },
    })),
  resetFilters: () => set({ filters: createDefaultFilters() }),
}));

export const buildFilterQuery = (filters: CommandCenterFilters): Record<string, string> => {
  const params: Record<string, string> = {};
  if (filters.timeRange.from) params.from = filters.timeRange.from;
  if (filters.timeRange.to) params.to = filters.timeRange.to;
  if (filters.category) params.category = filters.category;
  if (filters.deviceType) params.deviceType = filters.deviceType;
  if (filters.supplierId) params.supplierId = filters.supplierId;
  if (filters.region) params.region = filters.region;
  if (filters.riskLevel && filters.riskLevel !== 'all') params.riskLevel = filters.riskLevel;
  return params;
};
