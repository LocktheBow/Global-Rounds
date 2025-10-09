import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DASHBOARD_SAMPLE_PATHS = [
  join(process.cwd(), 'automation_prototype', 'data', 'dashboard_sample.json'),
  join(__dirname, '..', '..', '..', 'automation_prototype', 'data', 'dashboard_sample.json'),
];

export const AUTOMATION_AGENTS = ['ordering', 'payments', 'workforce', 'engagement', 'performance'] as const;

export type AutomationAgent = (typeof AUTOMATION_AGENTS)[number];

type Primitive = string | number | boolean | null;

type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue | undefined };

type JsonObject = { [key: string]: JsonValue | undefined };

interface DashboardData {
  ordering?: JsonValue;
  payments?: JsonValue;
  workforce?: JsonValue;
  engagement?: JsonValue;
  performance?: JsonValue;
  finance?: JsonValue;
  inventory_forecast?: Record<string, InventoryForecastEntry>;
  tasks?: TaskRecord[];
}

interface InventoryForecastEntry extends JsonObject {
  on_hand?: JsonValue;
  forecast_units?: JsonValue;
  recommended_buffer?: JsonValue;
  action?: JsonValue;
}

type TaskRecord = JsonObject & { id: string };

interface AgentStatus {
  agent: AutomationAgent;
  last_run: string | null;
  records: number;
}

interface PortalOrderPayload {
  patient_id?: string;
  supply_sku?: string;
  quantity?: number;
  priority?: string;
  delivery_mode?: string;
  requested_date?: string;
  notes?: string;
}

interface InventoryScenarioRequest {
  growth_percent?: number;
  lead_time_delta?: number;
  skus?: string[] | string | null;
}

interface InventoryScenarioResponse {
  growth_percent: number;
  lead_time_delta: number;
  lead_time_applied: number;
  skus: string[];
  baseline: Record<string, InventoryForecastEntry>;
  scenario: Record<string, InventoryForecastEntry>;
  deltas: Record<
    string,
    {
      forecast_units: number;
      recommended_buffer: number;
    }
  >;
  generated_at: string;
}

interface DashboardAskMessage {
  role: string;
  content: string;
}

interface DashboardAskRequest {
  messages?: DashboardAskMessage[];
  context?: Record<string, JsonValue>;
}

interface DashboardAskResponse {
  id: string;
  model: string;
  message: {
    role: string;
    content: string;
  };
}

interface AutomationState {
  data: DashboardData;
  tasks: TaskRecord[];
  moduleLastRun: Record<AutomationAgent, string | null>;
}

const INITIAL_LAST_RUN_OFFSET_MS = 45 * 60 * 1000;

const state: AutomationState = loadInitialAutomationState();

const AUTOMATION_AGENT_SET = new Set<AutomationAgent>(AUTOMATION_AGENTS);

export function isAutomationAgent(value: unknown): value is AutomationAgent {
  return typeof value === 'string' && AUTOMATION_AGENT_SET.has(value as AutomationAgent);
}

function loadInitialAutomationState(): AutomationState {
  const data = loadDashboardSample();
  const baselineTasks = Array.isArray(data.tasks) ? cloneTasks(data.tasks) : [];
  const now = Date.now();
  const moduleLastRun = AUTOMATION_AGENTS.reduce<Record<AutomationAgent, string | null>>((acc, agent, index) => {
    const timestamp = new Date(now - INITIAL_LAST_RUN_OFFSET_MS * (index + 1)).toISOString();
    acc[agent] = timestamp;
    return acc;
  }, {} as Record<AutomationAgent, string | null>);

  return {
    data,
    tasks: baselineTasks,
    moduleLastRun,
  };
}

function loadDashboardSample(): DashboardData {
  const errors: Array<{ path: string; error: unknown }> = [];
  for (const candidate of DASHBOARD_SAMPLE_PATHS) {
    try {
      const raw = readFileSync(candidate, 'utf-8');
      const parsed = JSON.parse(raw) as DashboardData;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (error) {
      errors.push({ path: candidate, error });
    }
  }
  if (errors.length) {
    errors.forEach(({ path, error }) => {
      // eslint-disable-next-line no-console
      console.warn(`Unable to load dashboard sample data at ${path}`, error);
    });
  }
  return {};
}

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

function cloneTasks(tasks: TaskRecord[]): TaskRecord[] {
  return tasks.map((task) => ({ ...clone(task) }));
}

function ensureStateLoaded(): void {
  if (!state.data || Object.keys(state.data).length === 0) {
    state.data = loadDashboardSample();
  }
  if (!Array.isArray(state.tasks) || state.tasks.length === 0) {
    const baseline = Array.isArray(state.data.tasks) ? state.data.tasks : [];
    state.tasks = cloneTasks(baseline);
  }
}

function resolveRecordsCount(agent: AutomationAgent): number {
  const data = state.data;
  switch (agent) {
    case 'ordering': {
      const ordering = data.ordering as { patient_work_orders?: unknown[] } | undefined;
      return Array.isArray(ordering?.patient_work_orders) ? ordering?.patient_work_orders.length : 0;
    }
    case 'payments': {
      const payments = data.payments as { underpayments?: unknown[] } | undefined;
      return Array.isArray(payments?.underpayments) ? payments?.underpayments.length : 0;
    }
    case 'workforce': {
      const workforce = data.workforce as { staffing_plan?: unknown[] } | undefined;
      return Array.isArray(workforce?.staffing_plan) ? workforce?.staffing_plan.length : 0;
    }
    case 'engagement': {
      const engagement = data.engagement as {
        patient_messages?: unknown[];
        case_manager_messages?: unknown[];
      } | undefined;
      const patient = Array.isArray(engagement?.patient_messages) ? engagement.patient_messages.length : 0;
      const manager = Array.isArray(engagement?.case_manager_messages) ? engagement.case_manager_messages.length : 0;
      return patient + manager;
    }
    case 'performance': {
      const performance = data.performance as { trend_summary?: unknown[] } | undefined;
      return Array.isArray(performance?.trend_summary) ? performance?.trend_summary.length : 0;
    }
    default:
      return 0;
  }
}

function toIsoTimestamp(date: Date): string {
  return date.toISOString();
}

export function getAgentStatuses(): AgentStatus[] {
  ensureStateLoaded();
  return AUTOMATION_AGENTS.map((agent) => ({
    agent,
    last_run: state.moduleLastRun[agent] ?? null,
    records: resolveRecordsCount(agent),
  }));
}

export function getDashboardSnapshot(): DashboardData & { module_last_run: Record<string, string | null> } {
  ensureStateLoaded();
  const snapshot: DashboardData & { module_last_run: Record<string, string | null> } = {
    ordering: clone(state.data.ordering),
    payments: clone(state.data.payments),
    workforce: clone(state.data.workforce),
    engagement: clone(state.data.engagement),
    performance: clone(state.data.performance),
    finance: clone(state.data.finance),
    inventory_forecast: clone(state.data.inventory_forecast),
    tasks: cloneTasks(state.tasks),
    module_last_run: { ...state.moduleLastRun },
  };
  return snapshot;
}

export function getTasks(): { tasks: TaskRecord[] } {
  ensureStateLoaded();
  return {
    tasks: cloneTasks(state.tasks),
  };
}

export function acknowledgeTask(taskId: string): TaskRecord | null {
  ensureStateLoaded();
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return null;
  }
  task.status = 'in_progress';
  task.updated_at = toIsoTimestamp(new Date());
  syncTasksIntoData();
  return { ...task };
}

export function updateTaskStatus(taskId: string, status: string): TaskRecord | null {
  ensureStateLoaded();
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return null;
  }
  task.status = status;
  task.updated_at = toIsoTimestamp(new Date());
  syncTasksIntoData();
  return { ...task };
}

export function createPortalOrder(payload: PortalOrderPayload) {
  ensureStateLoaded();
  const ordering = (state.data.ordering ??= {});
  const workOrders = (ordering as Record<string, JsonValue>).patient_work_orders as TaskRecord[] | undefined;
  const list = Array.isArray(workOrders) ? workOrders : [];
  const created = {
    id: `PO-${Date.now()}`,
    created_at: toIsoTimestamp(new Date()),
    status: 'submitted',
    ...payload,
  };
  list.push(created);
  (ordering as Record<string, JsonValue>).patient_work_orders = list;
  return { id: created.id, status: created.status };
}

export function runAgents(
  agents: AutomationAgent[],
): { run_at: string; payload: Partial<DashboardData> & { module_last_run: Record<string, string | null> } } {
  ensureStateLoaded();
  const runAt = toIsoTimestamp(new Date());
  const payload: Partial<DashboardData> = {};

  agents.forEach((agent) => {
    state.moduleLastRun[agent] = runAt;
    payload[agent] = clone(state.data[agent] as JsonValue);
  });

  syncTasksIntoData();

  return {
    run_at: runAt,
    payload: {
      ...payload,
      tasks: cloneTasks(state.tasks),
      inventory_forecast: clone(state.data.inventory_forecast),
      module_last_run: { ...state.moduleLastRun },
    },
  };
}

export function runAllAgents(): { run_at: string; payload: DashboardData & { module_last_run: Record<string, string | null> } } {
  ensureStateLoaded();
  const runAt = toIsoTimestamp(new Date());
  AUTOMATION_AGENTS.forEach((agent) => {
    state.moduleLastRun[agent] = runAt;
  });
  syncTasksIntoData();
  const snapshot = getDashboardSnapshot();
  return {
    run_at: runAt,
    payload: snapshot,
  };
}

export function getInventoryForecast(): Array<{ supply_sku: string } & InventoryForecastEntry> {
  ensureStateLoaded();
  const source = state.data.inventory_forecast ?? {};
  return Object.entries(source).map(([sku, details]) => ({
    supply_sku: sku,
    ...(clone(details) ?? {}),
  }));
}

export function runInventoryScenario(request: InventoryScenarioRequest): InventoryScenarioResponse {
  ensureStateLoaded();
  const growthPercent = Number(request.growth_percent ?? 0);
  const leadDelta = Number(request.lead_time_delta ?? 0);
  const appliedLead = 14 + leadDelta;
  const multiplier = 1 + growthPercent / 100;
  const selectedSkus = normalizeSkuList(request.skus);
  const baseline = state.data.inventory_forecast ?? {};
  const activeSkus = selectedSkus.length ? selectedSkus : Object.keys(baseline);

  const scenario: Record<string, InventoryForecastEntry> = {};
  const deltas: Record<string, { forecast_units: number; recommended_buffer: number }> = {};

  activeSkus.forEach((sku) => {
    const base = baseline[sku] || {};
    const baseForecast = Number(base.forecast_units ?? 0);
    const baseBuffer = Number(base.recommended_buffer ?? 0);
    const adjustedForecast = Number.isFinite(baseForecast) ? baseForecast * multiplier : baseForecast;
    const adjustedBuffer = Number.isFinite(baseBuffer) ? baseBuffer + leadDelta : baseBuffer;
    scenario[sku] = {
      ...clone(base),
      forecast_units: roundToTwo(adjustedForecast),
      recommended_buffer: roundToTwo(Math.max(adjustedBuffer, 0)),
    };
    deltas[sku] = {
      forecast_units: roundToTwo(adjustedForecast - baseForecast),
      recommended_buffer: roundToTwo((adjustedBuffer ?? 0) - baseBuffer),
    };
  });

  return {
    growth_percent: roundToTwo(growthPercent),
    lead_time_delta: roundToTwo(leadDelta),
    lead_time_applied: roundToTwo(appliedLead),
    skus: activeSkus,
    baseline: clone(baseline),
    scenario,
    deltas,
    generated_at: toIsoTimestamp(new Date()),
  };
}

export function askDashboard(request: DashboardAskRequest): DashboardAskResponse {
  ensureStateLoaded();
  const question = String(request?.messages?.slice(-1)?.[0]?.content || '').trim();
  const totals = summariseDashboard();
  const responseLines = [
    question ? `You asked: ${question}` : 'Current Command Center outlook:',
    `• Tasks open: ${totals.tasksOpen} (high priority ${totals.tasksHigh}).`,
    `• Ordering queue: ${totals.orderingWorkOrders} patient work orders, ${totals.complianceAlerts} compliance alerts.`,
    `• Underpayments: ${totals.paymentsUnderpayments} flagged for appeals.`,
    `• Workforce coverage: ${totals.workforceShifts} shifts modeled.`,
  ];
  return {
    id: `local-${Date.now()}`,
    model: 'dashboard-local-sim',
    message: {
      role: 'assistant',
      content: responseLines.join('\n'),
    },
  };
}

function summariseDashboard() {
  const tasks = state.tasks ?? [];
  const ordering = state.data.ordering as { patient_work_orders?: unknown[]; compliance_alerts?: unknown[] } | undefined;
  const payments = state.data.payments as { underpayments?: unknown[] } | undefined;
  const workforce = state.data.workforce as { staffing_plan?: unknown[] } | undefined;

  const counts = tasks.reduce(
    (acc, task) => {
      const status = String(task.status || '').toLowerCase();
      if (status === 'open') {
        acc.tasksOpen += 1;
      }
      if (String(task.priority || '').toLowerCase() === 'high') {
        acc.tasksHigh += 1;
      }
      return acc;
    },
    { tasksOpen: 0, tasksHigh: 0 },
  );

  return {
    ...counts,
    orderingWorkOrders: Array.isArray(ordering?.patient_work_orders) ? ordering?.patient_work_orders.length : 0,
    complianceAlerts: Array.isArray(ordering?.compliance_alerts) ? ordering?.compliance_alerts.length : 0,
    paymentsUnderpayments: Array.isArray(payments?.underpayments) ? payments?.underpayments.length : 0,
    workforceShifts: Array.isArray(workforce?.staffing_plan) ? workforce?.staffing_plan.length : 0,
  };
}

function normalizeSkuList(value: InventoryScenarioRequest['skus']): string[] {
  if (Array.isArray(value)) {
    return value.map((sku) => String(sku).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function roundToTwo(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function syncTasksIntoData(): void {
  const baselineTasks = Array.isArray(state.data.tasks) ? state.data.tasks : [];
  if (baselineTasks.length !== state.tasks.length) {
    state.data.tasks = cloneTasks(state.tasks);
    return;
  }
  state.data.tasks = state.tasks.map((task) => ({ ...task }));
}
