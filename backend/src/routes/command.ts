import type { Request, Response } from 'express';
import { Router } from 'express';
import { getCommandInsights } from '../services/command';

export const commandRouter = Router();

commandRouter.get('/insights', (_req: Request, res: Response) => {
  const payload = getCommandInsights();
  res.json(payload);
});

export default commandRouter;
