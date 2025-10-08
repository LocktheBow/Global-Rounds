export interface CommandInsightSegment {
  label: string;
  value: number;
  color?: string;
}

export interface CommandTaskInsight {
  total: number;
  slaBreaches: number;
  dataset: CommandInsightSegment[];
}

export interface CommandFinanceSegment extends CommandInsightSegment {
  displayValue?: string;
}

export interface CommandFinanceInsight {
  dataset: CommandFinanceSegment[];
  meta: {
    snapshotDate?: string | null;
    baselineDso: number;
  };
}

export interface CommandInventoryInsight {
  dataset: CommandInsightSegment[];
  totalSkus: number;
  scenarioAvailable: boolean;
}

export interface CommandInsightsResponse {
  tasks: CommandTaskInsight;
  finance: CommandFinanceInsight;
  inventory: CommandInventoryInsight;
}
