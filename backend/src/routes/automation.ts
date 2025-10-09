import type { Request, Response } from 'express';
import { Router } from 'express';
import {
  acknowledgeTask,
  askDashboard,
  createPortalOrder,
  getAgentStatuses,
  getDashboardSnapshot,
  getInventoryForecast,
  getTasks,
  isAutomationAgent,
  runAgents,
  runAllAgents,
  runInventoryScenario,
  updateTaskStatus,
} from '../services/automation';

const automationRouter = Router();

automationRouter.get('/agents/status', (_req: Request, res: Response) => {
  const payload = getAgentStatuses();
  res.json(payload);
});

automationRouter.post('/agents/run', (req: Request, res: Response) => {
  const agents = Array.isArray(req.body?.agents) ? req.body.agents : [];
  const filteredAgents = agents.filter((agent): agent is string => typeof agent === 'string');
  const validAgents = filteredAgents.filter(isAutomationAgent);
  if (!validAgents.length) {
    return res.status(400).json({ detail: 'Request must include agents to run.' });
  }
  const payload = runAgents(validAgents);
  return res.json(payload);
});

automationRouter.post('/run-all', (_req: Request, res: Response) => {
  const payload = runAllAgents();
  res.json(payload);
});

automationRouter.get('/last-run', (_req: Request, res: Response) => {
  const payload = getDashboardSnapshot();
  res.json(payload);
});

automationRouter.get('/tasks', (_req: Request, res: Response) => {
  const payload = getTasks();
  res.json(payload);
});

automationRouter.post('/tasks/:taskId/acknowledge', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = acknowledgeTask(taskId);
  if (!task) {
    return res.status(404).json({ detail: `Task ${taskId} not found.` });
  }
  return res.json({ task });
});

automationRouter.post('/tasks/:taskId/status', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const status = String(req.body?.status || '').trim();
  if (!status) {
    return res.status(400).json({ detail: 'Status is required.' });
  }
  const task = updateTaskStatus(taskId, status);
  if (!task) {
    return res.status(404).json({ detail: `Task ${taskId} not found.` });
  }
  return res.json({ task });
});

automationRouter.post('/portal/orders', (req: Request, res: Response) => {
  const payload = createPortalOrder(req.body || {});
  res.status(201).json(payload);
});

automationRouter.get('/inventory/forecast', (_req: Request, res: Response) => {
  const payload = getInventoryForecast();
  res.json(payload);
});

automationRouter.post('/inventory/scenario', (req: Request, res: Response) => {
  const payload = runInventoryScenario(req.body || {});
  res.json(payload);
});

automationRouter.post('/dashboard/ask', (req: Request, res: Response) => {
  const payload = askDashboard(req.body || {});
  res.json(payload);
});

export default automationRouter;
