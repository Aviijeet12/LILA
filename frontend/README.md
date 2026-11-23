# LILA BLACK Frontend

This React, TypeScript, and Vite application reads the processed telemetry artifacts in `public/data/processed/`. It does not require a runtime API server.

From this directory:

```bash
npm install
npm run dev
npm run build
npm test -- --run
```

The Vercel project root is `frontend`; [`vercel.json`](vercel.json) configures the production build, static output, and SPA route fallback. For the full project setup, data pipeline, coordinate model, findings, and current deployment status, see the repository [README](../README.md), [architecture](../ARCHITECTURE.md), and [insights](../INSIGHTS.md).
