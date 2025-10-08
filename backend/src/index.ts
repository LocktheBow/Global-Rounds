import { createApp } from './app';

const PORT = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Analytics service listening on port ${PORT}`);
});
