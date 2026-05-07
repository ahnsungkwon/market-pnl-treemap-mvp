# LIVE_KIWOOM 연동 가이드

이 문서는 Mac mini 백엔드에서 Kiwoom REST API를 사용해 GitHub Pages 프론트에 국내주식 가격을 제공하는 절차입니다.

## 1) Local env

`apps/api/.env.kiwoom.local` (커밋 금지):

```bash
PORT=3001
CORS_ORIGIN=http://localhost:5173,https://ahnsungkwon.github.io
MARKET_DATA_PROVIDER=kiwoom
KIWOOM_ENV=prod
KIWOOM_APP_KEY=YOUR_APP_KEY
KIWOOM_SECRET_KEY=YOUR_SECRET_KEY
KIWOOM_POLL_MS=15000
WATCH_SYMBOLS=005930,000660,005380,035420,051910,068270
```

`KIWOOM_ENV=prod`는 운영 도메인 `https://api.kiwoom.com`, `KIWOOM_ENV=mock` 또는 `vps`는 모의투자 도메인 `https://mockapi.kiwoom.com`을 사용합니다.

## 2) Backend

```bash
npm install
npm run start:api
```

확인:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/market
curl http://localhost:3001/treemap
curl http://localhost:3001/realtime
```

성공 시 `/health`에 `provider: "kiwoom"`, `data_source: "kiwoom"`, `realtime_mode: "polling"`이 표시됩니다.

## 3) Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:3001
```

GitHub Actions secrets:

```text
VITE_API_BASE_URL=https://xxx.trycloudflare.com
VITE_WS_URL=wss://xxx.trycloudflare.com/realtime
```

Kiwoom app key와 secret key는 GitHub에 넣지 않습니다.

## 4) 구현 범위

- 접근토큰 발급: `POST /oauth2/token`
- 주식기본정보 요청: `POST /api/dostk/stkinfo`, `api-id: ka10001`
- 주문/계좌/잔고 기능 없음
- 실시간 직접 WebSocket 대신 REST polling 결과를 backend `/realtime` WebSocket으로 push
