# Global Rounds Command Center

## Getting Started

1. Install dependencies (requires network access):
   ```bash
   pnpm install
   ```
2. Generate synthetic analytics data:
   ```bash
   pnpm seed
   ```
3. Run the full stack in dev mode (starts Vite + Express concurrently):
   ```bash
   pnpm dev
   ```
   - Frontend: http://localhost:5173/CommandCenter
   - Backend API: http://localhost:4000/api/analytics/summary

## Testing

Run the shared Jest suites across workspace packages:
```bash
pnpm test
```
# Global-Rounds
