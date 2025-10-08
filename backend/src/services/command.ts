import { getSeedData } from '../db/store';
import type { OrderRecord, InventoryRecord } from '../db/types';

const TASK_STATUS_OPEN: OrderRecord['status'][] = ['ordered'];
const TASK_STATUS_IN_PROGRESS: OrderRecord['status'][] = ['shipped'];
const TASK_STATUS_CLOSED: OrderRecord['status'][] = ['delivered', 'paid'];

const FINANCE_DSO_BASELINE = 45;

const pickTaskBucket = (status: OrderRecord['status']) => {
  if (TASK_STATUS_OPEN.includes(status)) return 'open';
  if (TASK_STATUS_IN_PROGRESS.includes(status)) return 'in_progress';
  if (TASK_STATUS_CLOSED.includes(status)) return 'closed';
  return 'other';
};

const isOrderActive = (status: OrderRecord['status']) =>
  !TASK_STATUS_CLOSED.includes(status) && status !== 'canceled';

const computeTaskInsights = (orders: OrderRecord[]) => {
  const counts = orders.reduce(
    (acc, order) => {
      const bucket = pickTaskBucket(order.status);
      if (bucket === 'open') acc.open += 1;
      if (bucket === 'in_progress') acc.inProgress += 1;
      if (bucket === 'closed') acc.closed += 1;
      if (isOrderActive(order.status) && order.leadTimeDays > 14) {
        acc.slaBreaches += 1;
      }
      return acc;
    },
    { open: 0, inProgress: 0, closed: 0, slaBreaches: 0 },
  );

  const dataset = [
    { label: 'Open', value: counts.open, color: '#38bdf8' },
    { label: 'In Progress', value: counts.inProgress, color: '#22d3ee' },
    { label: 'Closed', value: counts.closed, color: '#14b8a6' },
  ];

  return {
    total: counts.open + counts.inProgress + counts.closed,
    slaBreaches: counts.slaBreaches,
    dataset,
  };
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const computeFinanceInsights = (orders: OrderRecord[]) => {
  const completed = orders.filter((order) => TASK_STATUS_CLOSED.includes(order.status));
  const laborMinutesSaved = completed.length * 24; // simple heuristic: 24 minutes per closed order
  const laborHours = laborMinutesSaved / 60;
  const projectedCash = sum(
    completed.map((order) => Math.max(order.qty, 0) * Math.max(order.unitPrice, 0)),
  );

  const dsoCurrent =
    completed.length > 0 ? sum(completed.map((order) => order.leadTimeDays)) / completed.length : 0;
  const dsoImprovement = Math.max(FINANCE_DSO_BASELINE - dsoCurrent, 0);

  return {
    dataset: [
      {
        label: 'Labor hrs saved',
        value: Number.isFinite(laborHours) ? Number(laborHours.toFixed(2)) : 0,
        displayValue: `${laborHours.toFixed(1)} hrs`,
        color: '#22d3ee',
      },
      {
        label: 'Projected cash ($K)',
        value: Number.isFinite(projectedCash) ? Number((projectedCash / 1000).toFixed(2)) : 0,
        displayValue: `$${projectedCash.toLocaleString()}`,
        color: '#38bdf8',
      },
      {
        label: 'DSO improvement',
        value: Number.isFinite(dsoImprovement) ? Number(dsoImprovement.toFixed(2)) : 0,
        displayValue: `${dsoImprovement.toFixed(1)} days`,
        color: '#facc15',
      },
    ],
    meta: {
      snapshotDate: new Date().toISOString(),
      baselineDso: FINANCE_DSO_BASELINE,
    },
  };
};

const computeInventoryDataset = (inventory: InventoryRecord[]) => {
  let reorder = 0;
  let monitor = 0;
  let healthy = 0;

  for (const item of inventory) {
    const daysToExpiry = Math.ceil(
      (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const lowStock = item.onHand < 50 && !item.backorderFlag;
    const critical = item.backorderFlag || item.onHand === 0;
    const ageing = item.lotAgeDays > 240 || daysToExpiry <= 45;

    if (critical || lowStock) {
      reorder += 1;
      continue;
    }
    if (ageing) {
      monitor += 1;
      continue;
    }
    healthy += 1;
  }

  return [
    { label: 'Reorder now', value: reorder, color: '#f97316' },
    { label: 'Monitor closely', value: monitor, color: '#fb7185' },
    { label: 'Healthy buffer', value: healthy, color: '#22c55e' },
  ];
};

const computeInventoryInsights = (inventory: InventoryRecord[]) => {
  const dataset = computeInventoryDataset(inventory);
  const totalSkus = inventory.length;

  return {
    dataset,
    totalSkus,
    scenarioAvailable: totalSkus > 0,
  };
};

export const getCommandInsights = () => {
  const data = getSeedData();
  return {
    tasks: computeTaskInsights(data.orders),
    finance: computeFinanceInsights(data.orders),
    inventory: computeInventoryInsights(data.inventory),
  };
};

export type CommandInsightsResponse = ReturnType<typeof getCommandInsights>;
