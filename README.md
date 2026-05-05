# Market P&L Treemap MVP

1분 단위 시황과 포지션 P&L을 트리맵으로 보여주는 MVP입니다.

## Scope

- REST market snapshot
- WebSocket tick ingest mock
- In-memory latest cache
- 1-minute OHLCV aggregation mock
- React treemap + table UI
- Position-based P&L overlay

## Stack

- Web: React + Vite + TypeScript
- API: Node.js + Express
- Visualization: Recharts Treemap
- Future infra: Redis + ClickHouse

## Local start

```bash
npm install
npm run dev
```

Then open:

- Web: `http://localhost:5173`
- API health: `http://localhost:3001/health`
- Market snapshot: `http://localhost:3001/market`
- Treemap data: `http://localhost:3001/treemap`

## Apps

- `apps/web`: dashboard UI
- `apps/api`: market API, mock feed, treemap endpoint
- `infra/clickhouse`: future schema
- `docs`: sprint plan and API contract

## MVP cutline

Do not implement order execution, multi-market support, or advanced indicators before the MVP is usable.

## GitHub Pages deploy

This repo includes `.github/workflows/pages.yml` so the frontend can be opened as a GitHub Pages app.

Expected URL:

```text
https://ahnsungkwon.github.io/market-pnl-treemap-mvp/
```

For details, see `docs/DEPLOY.md`.
