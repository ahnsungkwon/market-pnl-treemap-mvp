# 4-Day MVP Sprint

## Day 1 — Snapshot + auth skeleton

Goal: login-ready app shell and market snapshot table.

- [x] API app skeleton
- [x] Web app skeleton
- [x] `/market` endpoint
- [x] table UI
- [ ] auth session placeholder

## Day 2 — Live data pipeline

Goal: live tick path and 1-minute aggregation.

- [x] WebSocket mock feed
- [x] latest price in memory
- [x] `/bars/:symbol` mock aggregation
- [ ] Redis cache
- [ ] ClickHouse insert worker

## Day 3 — Treemap + P&L overlay

Goal: market-cap treemap with position P&L coloring.

- [x] `/treemap` endpoint
- [x] P&L calculation
- [x] treemap UI
- [ ] sector grouping
- [ ] emit-on-change dedupe

## Day 4 — Operations

Goal: usable deployed MVP.

- [ ] rate limit
- [ ] structured logging
- [ ] error monitoring
- [ ] deployment guide
- [ ] cost checklist
