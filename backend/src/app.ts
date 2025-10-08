import express from 'express';
import cors from 'cors';
import analyticsRouter from './routes/analytics';
import commandRouter from './routes/command';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/analytics', analyticsRouter);
  app.use('/api/command', commandRouter);

  const staticDir = join(process.cwd(), 'frontend', 'dist');
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => {
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  return app;
};

export default createApp;
