import express from 'express';
import cors from 'cors';
import analyticsRouter from './routes/analytics';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/analytics', analyticsRouter);

  return app;
};

export default createApp;
