# API Contract

## GET `/health`

```json
{
  "status": "ok",
  "generated_at": "2026-05-05T00:00:00.000Z"
}
```

## GET `/market`

```json
{
  "generated_at": "2026-05-05T00:00:00.000Z",
  "rows": [
    {
      "symbol": "005930.KS",
      "name": "Samsung Electronics",
      "sector": "Technology",
      "price": 65800,
      "prev_close": 65020,
      "change_pct": 1.2,
      "volume": 12600000,
      "free_float_mcap": 392000000000000
    }
  ]
}
```

## GET `/treemap`

```json
{
  "generated_at": "2026-05-05T00:00:00.000Z",
  "nodes": [
    {
      "id": "005930.KS",
      "label": "Samsung Electronics",
      "sector": "Technology",
      "value": 392000000000000,
      "price": 65800,
      "change_pct": 1.2,
      "qty": 100,
      "avg_price": 65000,
      "pnl_amount": 80000,
      "pnl_pct": 1.23
    }
  ]
}
```

## WebSocket

URL: `ws://localhost:3001`

Message type: `market.snapshot`

```json
{
  "type": "market.snapshot",
  "generated_at": "2026-05-05T00:00:00.000Z",
  "rows": [],
  "nodes": []
}
```
