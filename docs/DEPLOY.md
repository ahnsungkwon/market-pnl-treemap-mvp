# Deploy & Validation (GitHub Pages + API)

## 1. 배포 구성

- `apps/web`은 정적 사이트로 GitHub Pages에 배포됩니다.
- `apps/api`는 Mac mini 또는 별도 서버에서 실행되어야 합니다.
- 실시간 가격은 백엔드에서 **REST polling(15초)**을 주축으로 수집하고,
  백엔드는 `/realtime` WebSocket으로 최신 snapshot을 push합니다.
- 프런트는 가능 시 WebSocket(`VITE_WS_URL`)을 사용하다 실패하면 `/realtime` HTTP polling으로 폴백합니다.

## 2. GitHub Pages Workflow

`/.github/workflows/pages.yml`

- Build job: `npm run build`
- Required secrets:
  - `VITE_API_BASE_URL`
  - `VITE_WS_URL`

### 적용 방법

1. GitHub repo → Settings → Secrets and variables → Actions
2. `VITE_API_BASE_URL`, `VITE_WS_URL` 등록
3. Actions 탭에서 `Deploy web to GitHub Pages` 실행 또는 main 브랜치 push

## 3. 운영 체크리스트

### Backend 실행

```bash
npm install
cp apps/api/.env.example apps/api/.env.kis.local
# KIS: apps/api/.env.kis.local에 KIS_APP_KEY / KIS_APP_SECRET 입력
# Kiwoom: apps/api/.env.kiwoom.local에 KIWOOM_APP_KEY / KIWOOM_SECRET_KEY 입력
npm run start:api
```

임시 외부 HTTPS 노출:

```bash
cloudflared tunnel --url http://localhost:3001
```

### 기본 Endpoint 확인

```bash
curl $VITE_API_BASE_URL/health
curl $VITE_API_BASE_URL/market
curl $VITE_API_BASE_URL/treemap
curl $VITE_API_BASE_URL/positions
curl $VITE_API_BASE_URL/realtime
```

예시 응답 항목에 `data_source`가 `kis` 또는 `demo`로 나오면 동작 중입니다.
KIS 가격 연결 성공 시 `/health`의 `data_source`는 `kis`, `realtime_mode`는 `polling`입니다.

### WS/폴링 체크

```bash
# Polling은 /realtime을 15초 간격으로 읽음
curl $VITE_API_BASE_URL/realtime

# WS URL 테스트 (브라우저 콘솔/도구 권장)
# URL: $VITE_WS_URL
```

### GitHub Pages Health

- Actions → Pages workflow 성공
- 사이트 접속 후 헤더 상태문구가 `KIS live polling (15s)` 또는 `Kiwoom live polling (15s)`로 표시
- 업데이트 시간 값이 갱신되는지

## 4. 키/Secret 점검

- `apps/api/.env.kis.local`에는 KIS 키만 local 관리
- `.gitignore`로 커밋 차단됨
- GitHub 저장소에는 `apps/api/.env.kis.local`이 올라가면 안 됨
- GitHub Actions에는 `VITE_API_BASE_URL`, `VITE_WS_URL`만 등록하고 KIS key/secret은 등록하지 않음

## 5. 권장 운영 보완(다음 단계)

- API key 회전/만료 모니터링 알람
- `/realtime` 구독자 수/마지막 폴링 성공시간 메트릭
- API 에러율 알림
- `/health` 응답에 `uptime`, `runtime_version`, `error_count` 추가
