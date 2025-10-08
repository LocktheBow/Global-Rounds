import type { Request, Response } from 'express';
import { Router } from 'express';
import {
  getAnalyticsSummary,
  parseAnalyticsFilters,
  AnalyticsFilters,
} from '../services/analytics';
import { getSeedData } from '../db/store';
import type { ComplianceDocRecord, InventoryRecord, OrderRecord } from '../db/types';

export const analyticsRouter = Router();

const applyOrderFilters = (orders: OrderRecord[], filters: AnalyticsFilters) => {
  const summary = getAnalyticsSummary(filters);
  const allowedKeys = new Set(summary.revenueByCategory.map((row) => `${row.date}|${row.category}`));
  return orders.filter((order) => allowedKeys.has(`${order.date}|${order.category}`));
};

const applyInventoryFilters = (inventory: InventoryRecord[], filters: AnalyticsFilters) =>
  inventory.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.deviceType && item.deviceType !== filters.deviceType) return false;
    if (filters.supplierId && item.supplierId !== filters.supplierId) return false;
    return true;
  });

const applyComplianceFilters = (docs: ComplianceDocRecord[], filters: AnalyticsFilters) => {
  if (!filters.supplierId) return docs;
  return docs.filter((doc) => doc.supplierId === filters.supplierId);
};

analyticsRouter.get('/summary', (req: Request, res: Response) => {
  const filters = parseAnalyticsFilters(req.query as Record<string, unknown>);
  const payload = getAnalyticsSummary(filters);
  res.json(payload);
});

analyticsRouter.get('/drilldown', (req: Request, res: Response) => {
  const filters = parseAnalyticsFilters(req.query as Record<string, unknown>);
  const entity = String(req.query.entity ?? 'orders');
  const data = getSeedData();

  if (entity === 'orders') {
    const rows = applyOrderFilters(data.orders, filters).slice(0, 200);
    return res.json({ entity, rows });
  }
  if (entity === 'inventory') {
    const rows = applyInventoryFilters(data.inventory, filters).slice(0, 200);
    return res.json({ entity, rows });
  }
  if (entity === 'compliance') {
    const rows = applyComplianceFilters(data.complianceDocs, filters).slice(0, 200);
    return res.json({ entity, rows });
  }
  return res.status(400).json({ message: `Unsupported entity ${entity}` });
});

analyticsRouter.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const { events } = getSeedData();
  let index = Math.floor(Math.random() * events.length);

  const sendEvent = () => {
    const event = events[index % events.length];
    index += 1;
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const interval = setInterval(sendEvent, 5000);
  sendEvent();

  req.on('close', () => {
    clearInterval(interval);
  });
});

export default analyticsRouter;
