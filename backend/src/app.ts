import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import analyticsRouter from './routes/analytics';
import commandRouter from './routes/command';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/analytics', analyticsRouter);
  app.use('/api/command', commandRouter);
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ detail: 'Not Found' });
  });

  const staticDir = join(process.cwd(), 'automation_prototype', 'dashboard');
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  return app;
};

export default createApp;
