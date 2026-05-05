# Market P&L Treemap MVP

1분 단위 시황과 포지션 P&L을 트리맵으로 보여주는 MVP입니다.

## Scope

- REST market snapshot
- WebSocket tick ingest
- Redis latest cache
- 1-minute OHLCV aggregation
- ClickHouse `bars_1m` storage
- React treemap + table UI
- Position-based P&L overlay

## Stack

- Web: React + Vite + TypeScript
- API: Node.js + Express + TypeScript
- Cache: Redis
- DB: ClickHouse
- Local infra: Docker Compose

## Local start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Infra only:

```bash
docker compose up -d
```

## Apps

- `apps/web`: dashboard UI
- `apps/api`: market API, mock feed, treemap endpoint
- `infra/clickhouse`: schema
- `docs`: sprint plan and API contract

## MVP cutline

Do not implement order execution, multi-market support, or advanced indicators before the MVP is usable.
