# GitHub Issue Backlog

## P0

1. `feat(api): connect real market REST snapshot`
   - Replace mock market seed with provider adapter.
   - Normalize symbol, price, change_pct, volume, free_float_mcap.

2. `feat(api): add Redis latest cache`
   - Add Redis client.
   - Store latest symbol state under `latest:{symbol}`.

3. `feat(data): persist 1-minute bars to ClickHouse`
   - Create insert worker.
   - Insert OHLCV rows into `bars_1m`.

4. `feat(web): add position import`
   - Add local JSON or CSV position input.
   - Map qty and avg_price to treemap overlay.

5. `ops: add deployment guide`
   - Vercel web.
   - Fly.io or EC2 API.
   - ClickHouse Cloud.

## P1

1. `feat(web): group treemap by sector`
2. `feat(api): emit WebSocket messages only on change`
3. `feat(web): add symbol search and filters`
4. `ops: add health dashboard metrics`
