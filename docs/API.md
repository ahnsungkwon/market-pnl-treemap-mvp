# API Contract

## GET `/health`

```json
{
  "status": "ok",
  "provider": "kis",
  "mode": "prod",
  "time": "2026-05-05T00:00:00.000Z",
  "generated_at": "2026-05-05T00:00:00.000Z",
  "data_source": "kis",
  "realtime_mode": "polling",
  "poll_interval_ms": 15000,
  "kis_ws_requested": false,
  "kis_ws_enabled": false,
  "last_kis_update_at": "2026-05-05T00:00:00.000Z",
  "last_kis_error": null
}
```

- `data_source`:
  - `kis`: KIS REST 실시간 연동 성공
  - `kiwoom`: Kiwoom REST 실시간 연동 성공
  - `demo`: provider 키 미설정 또는 API 실패 시 데모 동작

## GET `/market`

```json
[
  {
    "symbol": "005930.KS",
    "code": "005930",
    "name": "Samsung Electronics",
    "sector": "Technology",
    "price": 65800,
    "prev_close": 65020,
    "change_pct": 1.2,
    "volume": 12600000,
    "free_float_mcap": 392000000000000,
    "source": "kis",
    "updated_at": "2026-05-05T00:00:00.000Z"
  }
]
```

## GET `/treemap`

```json
[
  {
    "id": "005930.KS",
    "symbol": "005930.KS",
    "name": "Samsung Electronics",
    "label": "Samsung Electronics",
    "sector": "Technology",
    "value": 392000000000000,
    "price": 65800,
    "change_pct": 1.2,
    "qty": 10,
    "avg_price": 220000,
    "pnl_amount": -1542000,
    "pnl_pct": -70.09,
    "source": "kis",
    "updated_at": "2026-05-05T00:00:00.000Z"
  }
]
```

## GET `/positions`

```json
[
  {
    "symbol": "005930.KS",
    "qty": 10,
    "avg_price": 220000
  }
]
```

## GET `/realtime`

Message type used by HTTP polling path and WebSocket broadcast.

```json
{
  "type": "market.snapshot",
  "provider": "kis",
  "mode": "prod",
  "data_source": "kis",
  "realtime_mode": "polling",
  "generated_at": "2026-05-05T00:00:00.000Z",
  "rows": [],
  "nodes": [],
  "data": [],
  "note": "KIS live quote data."
}
```

### WebSocket

- URL: `/realtime`
- Upgrade path: `ws://<host>/realtime`
- This MVP uses KIS REST polling and broadcasts the latest snapshot over backend WebSocket.

WS가 실패하면 프런트는 HTTP polling(`GET /realtime`) 15초로 fallback 됩니다.
