# LIVE_KIS 연동 가이드

이 문서는 GitHub Pages + Cloudflare Tunnel + Mac mini 백엔드 조합에서
KIS 실시간/준실시간 가격 연동을 위한 실행 절차를 정리합니다.

## 1) API 백엔드에서 필요한 환경변수

`apps/api/.env.kis.local` (커밋 ❌):

```bash
PORT=3001
CORS_ORIGIN=http://localhost:5173,https://ahnsungkwon.github.io
MARKET_DATA_PROVIDER=kis
KIS_ENV=prod
KIS_APP_KEY=YOUR_APP_KEY
KIS_APP_SECRET=YOUR_APP_SECRET
KIS_USE_WS=false
KIS_POLL_MS=15000
WATCH_SYMBOLS=005930,000660,005380,035420,051910,068270
```

> `KIS_APP_KEY`, `KIS_APP_SECRET`이 없으면 API는 데모 데이터로 자동 동작합니다.
> `KIS_ENV=prod`는 실전투자, `KIS_ENV=vps`는 모의투자입니다.

## 2) Frontend(정적) 빌드 환경변수 (GitHub Secrets)

GitHub Pages 워크플로우에서 사용:

- `VITE_API_BASE_URL`
  - 예: `https://api.your-domain.example` 또는 Cloudflare Tunnel 공개 도메인
- `VITE_WS_URL`
  - 예: `wss://api.your-domain.example/realtime`

예시(`Actions > Secrets and variables > Actions`)

```text
VITE_API_BASE_URL=https://xxx.trycloudflare.com
VITE_WS_URL=wss://xxx.trycloudflare.com/realtime
```

## 3) 백엔드 실행/검증

```bash
cd /path/to/market-pnl-treemap-mvp
npm install
npm run start:api
```

브라우저/터미널에서 확인:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/market
curl http://localhost:3001/treemap
curl http://localhost:3001/positions
curl http://localhost:3001/realtime
```

응답 예시

```json
{
  "status": "ok",
  "provider": "kis",
  "mode": "prod",
  "data_source": "kis",
  "realtime_mode": "polling",
  "poll_interval_ms": 15000
}
```

## 4) Cloudflare Tunnel 적용

임시 테스트는 quick tunnel이 가장 단순합니다.

```bash
cloudflared tunnel --url http://localhost:3001
```

출력:

```text
https://xxx.trycloudflare.com
```

연결 확인:

```bash
curl https://xxx.trycloudflare.com/health
curl https://xxx.trycloudflare.com/market
```

WebSocket URL은 다음 형태입니다.

```text
wss://xxx.trycloudflare.com/realtime
```

장기 운영은 named tunnel을 사용합니다.

```bash
cloudflared tunnel create market-pnl-mvp
cloudflared tunnel route dns <TUNNEL_ID> api.your-domain.example
cloudflared tunnel run market-pnl-mvp
```

터널 설정 파일(예):

```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /path/to/<TUNNEL_ID>.json
warp-routing: {}

ingress:
  - hostname: api.your-domain.example
    service: http://localhost:3001
  - service: http_status:404
```

연결 확인:

```bash
curl https://api.your-domain.example/health
curl https://api.your-domain.example/realtime
```

## 5) Frontend 확인

GitHub Pages 배포 후 콘솔에서 연결 상태 문구가 다음으로 표시되는지 확인:

- `KIS live polling (15s)`
- `KIS live`

현재 MVP는 KIS REST polling을 사용하므로 일반적으로 `KIS live polling (15s)`가 정상입니다.
브라우저 WS가 불안정하면 자동으로 HTTP polling(`/realtime`)으로 전환됩니다.

## 6) API 실패 fallback 정책

- 초기 호출(`market`, `treemap`) 실패 시: **frontend는 demo 데이터**로 fallback
- API 연결 성공 후에는 WS 실패 시 `/realtime` polling으로 폴백
- `KIS` 키 미입력 시 API 자체는 demo 모드로 동작
- fallback 화면 문구: `Demo data · not live market price`

## 7) 민감정보 점검

커밋 전 아래 파일이 추적되지 않는지 확인:

```bash
git status --short | grep -E '\.env|\.env\.'
```

반드시 다음은 커밋되지 않아야 합니다.

- `apps/api/.env.kis.local`
- `.env`, `.env.*`

또한 `.gitignore`는 이 항목을 강제 차단하도록 수정되어 있습니다.

## 8) GitHub Actions Secrets

GitHub repo → Settings → Secrets and variables → Actions에서 아래만 등록합니다.

```text
VITE_API_BASE_URL=https://xxx.trycloudflare.com
VITE_WS_URL=wss://xxx.trycloudflare.com/realtime
```

KIS key/secret은 GitHub Actions secret에 넣지 않습니다. Mac mini의 `apps/api/.env.kis.local`에만 둡니다.
