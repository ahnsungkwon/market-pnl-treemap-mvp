# Market P&L Treemap MVP

GitHub Pages 정적 프론트(`apps/web`)와 API 백엔드(`apps/api`)를 분리한 MVP 입니다.
현재 단계는 **가격 조회 + P&L 표시**만 제공합니다.

- 주문/계좌/체결 실거래 기능은 구현하지 않습니다.
- GitHub Pages는 정적 frontend만 배포되고, 실시간 가격/폴링은 Backend API + Cloudflare Tunnel(또는 직접 노출 서버)로 제공합니다.

## 구현된 API 엔드포인트

- `GET /health`
- `GET /market`
- `GET /positions`
- `GET /treemap`
- `GET /realtime`
- `GET /realtime`는 WebSocket 업그레이드 경로(`/realtime`)도 같이 사용합니다.

## repo 구조

```text
market-pnl-treemap-mvp/
├─ apps/
│  ├─ api/      # Express + WebSocket + KIS provider
│  └─ web/      # React + Vite
├─ docs/
│  ├─ API.md
│  ├─ DEPLOY.md
│  ├─ ISSUES.md
│  ├─ SPRINT.md
│  └─ LIVE_KIS.md
├─ .github/workflows/pages.yml
├─ docker-compose.yml
└─ package.json
```

## 로컬 실행

```bash
npm install
cp apps/api/.env.example apps/api/.env.kis.local
```

`apps/api/.env.kis.local`에만 KIS 값을 입력합니다.

```bash
PORT=3001
CORS_ORIGIN=http://localhost:5173,https://ahnsungkwon.github.io
MARKET_DATA_PROVIDER=kis
KIS_ENV=prod # prod=실전투자, vps=모의투자
KIS_APP_KEY=your_kis_app_key
KIS_APP_SECRET=your_kis_app_secret
KIS_USE_WS=false
KIS_POLL_MS=15000
WATCH_SYMBOLS=005930,000660,005380,035420,051910,068270
```

Kiwoom REST API를 쓸 때는 `apps/api/.env.kiwoom.local`을 사용합니다.

```bash
PORT=3001
CORS_ORIGIN=http://localhost:5173,https://ahnsungkwon.github.io
MARKET_DATA_PROVIDER=kiwoom
KIWOOM_ENV=prod # prod=실전투자, mock/vps=모의투자
KIWOOM_APP_KEY=your_kiwoom_app_key
KIWOOM_SECRET_KEY=your_kiwoom_secret_key
KIWOOM_POLL_MS=15000
WATCH_SYMBOLS=005930,000660,005380,035420,051910,068270
```

API 실행:

```bash
npm run start:api
```

API 확인:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/market
curl http://localhost:3001/treemap
curl http://localhost:3001/realtime
```

프론트 실행:

```bash
VITE_API_BASE_URL=http://localhost:3001 \
VITE_WS_URL=ws://localhost:3001/realtime \
npm run dev:web
```

### 실행 URL

- Web: `http://localhost:5173`
- API Health: `http://localhost:3001/health`
- Market: `http://localhost:3001/market`
- Treemap: `http://localhost:3001/treemap`
- Positions: `http://localhost:3001/positions`
- Realtime: `http://localhost:3001/realtime`
- Realtime WS: `ws://localhost:3001/realtime`

## 실시간 연결 방식

- 기본 동작은 **KIS REST polling(15초)** 입니다.
- API 서버는 polling 결과를 `/realtime` WebSocket으로 push합니다.
- 웹은 WS URL(`VITE_WS_URL`)이 주어지면 WS로 연결을 시도하고, 실패하면 자동으로 `/realtime` HTTP polling으로 폴백합니다.
- API가 연결되지 않으면 frontend는 API 실패 시에만 내장 demo 데이터를 fallback으로 사용합니다.
- KIS 연결 성공 시 화면 상태는 `KIS live polling (15s)`로 표시됩니다.
- Kiwoom 연결 성공 시 화면 상태는 `Kiwoom live polling (15s)`로 표시됩니다.
- API 실패 또는 KIS 키 미설정 시 `Demo data · not live market price`로 표시됩니다.

## GitHub Pages 배포 및 CI

GitHub Pages는 정적 frontend만 배포합니다. KIS key/secret은 GitHub에 올리지 않습니다.

`.github/workflows/pages.yml`에서 사용되는 환경변수는 `VITE_API_BASE_URL`, `VITE_WS_URL`이며
GitHub Actions **Secrets**로 등록해야 합니다.

### 배포용 환경 변수(필수)

- `VITE_API_BASE_URL` : 예) `https://your-backend.example.com`
- `VITE_WS_URL` : 예) `wss://your-backend.example.com/realtime`

Cloudflare 임시 tunnel:

```bash
cloudflared tunnel --url http://localhost:3001
```

출력된 `https://xxxxx.trycloudflare.com` 값을 GitHub Actions secret에 넣습니다.

```text
VITE_API_BASE_URL=https://xxxxx.trycloudflare.com
VITE_WS_URL=wss://xxxxx.trycloudflare.com/realtime
```

Actions → `Deploy web to GitHub Pages`를 다시 실행하면 Pages build에 위 URL이 주입됩니다.

## 검증 체크리스트

- `GET /health`가 `status: ok`, `provider: kis`, `mode: prod|vps`를 반환
- `GET /market`이 배열을 반환하고 각 row에 `source`, `updated_at`, `price` 포함
- `GET /treemap`이 P&L fields(`pnl_pct`, `pnl_amount`) 포함
- 화면 우측 상단이 `Static demo`가 아니라 `KIS live polling (15s)` 또는 fallback 문구로 표시
- `.env`, `.env.*`, `apps/api/.env.kis.local`이 `git status`에 보이지 않음
- GitHub Pages에서 `VITE_API_BASE_URL`, `VITE_WS_URL` secret이 반영됨

자세한 실행/검증 절차는 `docs/LIVE_KIS.md`를 참고하세요.
