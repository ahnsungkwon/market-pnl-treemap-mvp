# Deploy to GitHub Pages

This repo is configured to deploy the web app to GitHub Pages through GitHub Actions.

## What gets deployed

Only the static frontend in `apps/web` is deployed to GitHub Pages.

The Express API and WebSocket server do not run on GitHub Pages. For the Pages build, the web app uses `VITE_DEMO_MODE=static`, which enables built-in mock market data and simulated 1-second ticks.

## Expected URL

After the workflow succeeds, the app should be available at:

```text
https://ahnsungkwon.github.io/market-pnl-treemap-mvp/
```

## Required GitHub setting

In the repository:

1. Go to **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main` or manually run the workflow from **Actions → Deploy web to GitHub Pages**.

## Using a real API later

Host `apps/api` on a backend platform, then set repository variables:

- `VITE_API_BASE_URL`
- `VITE_WS_URL`

Then change the workflow build environment from static mode to API mode.
