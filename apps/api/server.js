import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { WebSocketServer } from 'ws'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  const raw = readFileSync(filePath, 'utf8')

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.substring(0, separatorIndex).trim()
    const value = trimmed.substring(separatorIndex + 1).trim().replace(/^"|"$/g, '')

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

const API_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(API_DIR, '..', '..')

loadEnvFile(join(ROOT_DIR, '.env'))
loadEnvFile(join(ROOT_DIR, '.env.local'))
loadEnvFile(join(API_DIR, '.env'))
loadEnvFile(join(API_DIR, '.env.local'))
loadEnvFile(join(API_DIR, '.env.kis.local'))
loadEnvFile(join(API_DIR, '.env.kiwoom.local'))

const PORT = Number(process.env.PORT ?? 3001)
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173,https://ahnsungkwon.github.io'
const MARKET_DATA_PROVIDER = (process.env.MARKET_DATA_PROVIDER ?? 'kis').trim().toLowerCase()
const KIS_ENV = process.env.KIS_ENV === 'vps' ? 'vps' : 'prod'
const KIWOOM_ENV = ['mock', 'vps'].includes(process.env.KIWOOM_ENV) ? 'mock' : 'prod'
const configuredPollIntervalMs = Number(
  process.env.MARKET_POLL_MS ?? process.env.KIWOOM_POLL_MS ?? process.env.KIS_POLL_MS ?? process.env.KIS_POLL_INTERVAL_MS ?? 15000
)
const POLL_INTERVAL_MS =
  Number.isFinite(configuredPollIntervalMs) && configuredPollIntervalMs > 0 ? configuredPollIntervalMs : 15000
const DEFAULT_KIS_BASE_URL =
  KIS_ENV === 'vps' ? 'https://openapivts.koreainvestment.com:29443' : 'https://openapi.koreainvestment.com:9443'
const KIS_BASE_URL =
  process.env.KIS_BASE_URL && process.env.KIS_BASE_URL.trim() ? process.env.KIS_BASE_URL.trim() : DEFAULT_KIS_BASE_URL
const KIS_USE_WS = process.env.KIS_USE_WS === 'true'
const DEFAULT_KIWOOM_BASE_URL = KIWOOM_ENV === 'mock' ? 'https://mockapi.kiwoom.com' : 'https://api.kiwoom.com'
const KIWOOM_BASE_URL =
  process.env.KIWOOM_BASE_URL && process.env.KIWOOM_BASE_URL.trim()
    ? process.env.KIWOOM_BASE_URL.trim()
    : DEFAULT_KIWOOM_BASE_URL
const WATCH_SYMBOLS = (process.env.WATCH_SYMBOLS ?? '005930,000660,005380,035420,051910,068270')
  .split(',')
  .map((symbol) => symbol.trim())
  .filter(Boolean)

const KIS_APP_KEY = process.env.KIS_APP_KEY
const KIS_APP_SECRET = process.env.KIS_APP_SECRET
const KIWOOM_APP_KEY = process.env.KIWOOM_APP_KEY ?? process.env.KIWOOM_APPKEY
const KIWOOM_SECRET_KEY =
  process.env.KIWOOM_SECRET_KEY ?? process.env.KIWOOM_SECRETKEY ?? process.env.KIWOOM_APP_SECRET

const baseStockMetadata = [
  {
    symbol: '005930.KS',
    name: 'Samsung Electronics',
    sector: 'Technology',
    price: 65800,
    prev_close: 65020,
    volume: 12600000,
    free_float_mcap: 392000000000000
  },
  {
    symbol: '000660.KS',
    name: 'SK Hynix',
    sector: 'Technology',
    price: 120000,
    prev_close: 120600,
    volume: 7200000,
    free_float_mcap: 87400000000000
  },
  {
    symbol: '035420.KS',
    name: 'NAVER',
    sector: 'Communication',
    price: 186000,
    prev_close: 184400,
    volume: 850000,
    free_float_mcap: 30200000000000
  },
  {
    symbol: '051910.KS',
    name: 'LG Chem',
    sector: 'Materials',
    price: 382000,
    prev_close: 390000,
    volume: 430000,
    free_float_mcap: 21100000000000
  },
  {
    symbol: '005380.KS',
    name: 'Hyundai Motor',
    sector: 'Consumer Discretionary',
    price: 247000,
    prev_close: 244000,
    volume: 910000,
    free_float_mcap: 52100000000000
  },
  {
    symbol: '068270.KS',
    name: 'Celltrion',
    sector: 'Healthcare',
    price: 181000,
    prev_close: 179500,
    volume: 610000,
    free_float_mcap: 26100000000000
  }
]

const positions = [
  { symbol: '005930.KS', qty: 10, avg_price: 220000 },
  { symbol: '000660.KS', qty: 2, avg_price: 1400000 },
  { symbol: '005380.KS', qty: 3, avg_price: 500000 },
  { symbol: '035420.KS', qty: 5, avg_price: 180000 },
  { symbol: '051910.KS', qty: 1, avg_price: 390000 },
  { symbol: '068270.KS', qty: 4, avg_price: 175000 }
]

const positionBySymbol = new Map(positions.map((position) => [position.symbol, position]))

function parseCorsOrigins(raw) {
  if (raw === '*') return '*'
  const parts = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return parts.length ? parts : ['*']
}

function normalizeSymbol(symbol) {
  return symbol.replace(/\.(KS|KQ|KQX)$/i, '').trim()
}

function toDisplaySymbol(symbol) {
  const trimmed = symbol.trim()
  return /\.(KS|KQ|KQX)$/i.test(trimmed) ? trimmed.toUpperCase() : `${normalizeSymbol(trimmed)}.KS`
}

const stockMetadataByCode = new Map(baseStockMetadata.map((row) => [normalizeSymbol(row.symbol), row]))
const watchlistMetadata = WATCH_SYMBOLS.map((symbol) => {
  const displaySymbol = toDisplaySymbol(symbol)
  const code = normalizeSymbol(displaySymbol)
  const base = stockMetadataByCode.get(code)

  return (
    base ?? {
      symbol: displaySymbol,
      name: displaySymbol,
      sector: 'Watchlist',
      price: 1,
      prev_close: 1,
      volume: 0,
      free_float_mcap: 1
    }
  )
})

function roundPrice(value) {
  return Math.max(1, Math.round(value / 100) * 100)
}

function toNumber(value) {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined

  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/%/g, '')
    .trim()

  if (!normalized || normalized === '-' || normalized.toLowerCase() === 'null') return undefined

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function pickNumber(source, candidates) {
  for (const key of candidates) {
    const value = toNumber(source?.[key])
    if (value !== undefined) return value
  }
  return undefined
}

function pickString(source, candidates) {
  for (const key of candidates) {
    const raw = source?.[key]
    if (raw === undefined || raw === null) continue
    const value = String(raw).trim()
    if (value) return value
  }
  return undefined
}

function calculateChangePct(price, prevClose) {
  if (!Number.isFinite(price) || !Number.isFinite(prevClose) || prevClose === 0) return 0
  return Number((((price - prevClose) / prevClose) * 100).toFixed(2))
}

function parseKisExpiry(value) {
  if (!value) return null

  const normalized = String(value).trim().replace(' ', 'T')
  const parsed = new Date(normalized)

  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

function parseKiwoomExpiry(value) {
  const raw = String(value ?? '').replace(/\D/g, '')
  if (raw.length !== 14) return null

  const year = raw.slice(0, 4)
  const month = raw.slice(4, 6)
  const day = raw.slice(6, 8)
  const hour = raw.slice(8, 10)
  const minute = raw.slice(10, 12)
  const second = raw.slice(12, 14)
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)

  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

function absNumber(value) {
  const parsed = toNumber(value)
  return parsed === undefined ? undefined : Math.abs(parsed)
}

function normalizeKisMarketCap(value, fallback) {
  if (!Number.isFinite(value)) return fallback
  return value < 1_000_000_000_000 ? Math.round(value * 100_000_000) : Math.round(value)
}

function decorateMarketRows(rows, source, updatedAt) {
  return rows.map((row) => ({
    ...row,
    code: normalizeSymbol(row.symbol),
    source,
    updated_at: updatedAt
  }))
}

function makeTreemapNodes(rows) {
  return rows.map((row) => {
    const position = positionBySymbol.get(row.symbol)
    const qty = position?.qty ?? 0
    const avgPrice = position?.avg_price ?? 0
    const pnlAmount = position ? Math.round((row.price - avgPrice) * qty) : 0
    const pnlPct = position && avgPrice > 0 ? Number((((row.price - avgPrice) / avgPrice) * 100).toFixed(2)) : 0

    return {
      id: row.symbol,
      symbol: row.symbol,
      name: row.name,
      label: row.name,
      sector: row.sector,
      value: row.free_float_mcap,
      price: row.price,
      change_pct: row.change_pct,
      qty,
      avg_price: avgPrice,
      pnl_amount: pnlAmount,
      pnl_pct: pnlPct,
      source: row.source,
      updated_at: row.updated_at
    }
  })
}

function getDemoRows() {
  return watchlistMetadata.map((row) => ({
    ...row,
    change_pct: calculateChangePct(row.price, row.prev_close)
  }))
}

function advanceDemoRows(rows) {
  return rows.map((row) => {
    const drift = (Math.random() - 0.48) * 0.004
    const nextPrice = roundPrice(row.price * (1 + drift))
    const volumeDelta = Math.floor(Math.random() * 20000)

    return {
      ...row,
      price: nextPrice,
      volume: row.volume + volumeDelta,
      prev_close: row.prev_close,
      change_pct: calculateChangePct(nextPrice, row.prev_close)
    }
  })
}

class KISTokenManager {
  constructor({ baseUrl, appKey, appSecret }) {
    this.baseUrl = baseUrl
    this.appKey = appKey
    this.appSecret = appSecret
    this.token = null
    this.expireAt = 0
    this.inflight = null
  }

  get configured() {
    return Boolean(this.appKey && this.appSecret)
  }

  async getToken() {
    if (this.token && Date.now() < this.expireAt) return this.token
    if (this.inflight) return this.inflight

    this.inflight = (async () => {
      const tokenUrl = new URL('/oauth2/tokenP', this.baseUrl)

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: this.appKey,
          appsecret: this.appSecret
        })
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`KIS token request failed: ${response.status} ${body}`)
      }

      const payload = await response.json()
      const token = payload.access_token

      if (!token) {
        throw new Error(`KIS token response missing access_token: ${JSON.stringify(payload)}`)
      }

      const expiresIn = toNumber(payload.expires_in) ?? 3600
      const expiresAt =
        parseKisExpiry(payload.access_token_token_expired) ?? parseKisExpiry(payload.acess_token_token_expired)

      this.token = token
      this.expireAt = expiresAt ? expiresAt - 120_000 : Date.now() + Math.max(expiresIn - 120, 60) * 1000
      return this.token
    })()

    try {
      return await this.inflight
    } finally {
      this.inflight = null
    }
  }
}

class KISMarketProvider {
  constructor({ baseUrl, appKey, appSecret }) {
    this.name = 'kis'
    this.mode = KIS_ENV
    this.wsRequested = KIS_USE_WS
    this.wsEnabled = false
    this.baseUrl = baseUrl
    this.appKey = appKey
    this.appSecret = appSecret
    this.tokenManager = new KISTokenManager({ baseUrl, appKey, appSecret })
    this.quoteUrl = '/uapi/domestic-stock/v1/quotations/inquire-price'
  }

  get enabled() {
    return this.tokenManager.configured
  }

  getCommonHeaders(token) {
    return {
      'Content-Type': 'application/json',
      appkey: this.appKey,
      appsecret: this.appSecret,
      authorization: `Bearer ${token}`,
      tr_id: 'FHKST01010100',
      custtype: 'P'
    }
  }

  normalizeQuote(symbol, output) {
    const name = pickString(output, ['hts_kor_isnm', 'prdt_name', 'hts_kor_isnm_abrv', 'prdt_abbrv'])
    const price = pickNumber(output, ['stck_prpr', 'stck_prc', 'last'])
    const prevClose = pickNumber(output, ['stck_prdy_clpr', 'stck_prdy_clspr', 'prdy_clpr'])
    const volume = pickNumber(output, ['acml_vol', 'acml_vol_2', 'stck_trdvol', 'acml_vol2'])
    const freeFloat = pickNumber(output, ['mktcap', 'stac_mcap', 'hts_avls'])
    const changePct = pickNumber(output, ['prdy_ctrt'])

    return {
      symbol,
      name: name || symbol,
      price,
      prevClose,
      volume,
      freeFloat,
      changePct
    }
  }

  async fetchQuote(symbol) {
    if (!this.enabled) {
      return null
    }

    const token = await this.tokenManager.getToken()
    const queryCode = normalizeSymbol(symbol)

    const url = new URL(this.quoteUrl, this.baseUrl)
    url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J')
    url.searchParams.set('FID_INPUT_ISCD', queryCode)

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getCommonHeaders(token)
    })

    if (!response.ok) {
      throw new Error(`KIS quote request failed (${symbol}): ${response.status}`)
    }

    const payload = await response.json()
    const rawOutput = payload.output ?? payload.output1 ?? payload.output2

    if (payload.rt_cd && String(payload.rt_cd) !== '0') {
      throw new Error(`KIS quote api error for ${symbol}: ${payload.msg_cd} ${payload.msg1}`)
    }

    if (!rawOutput) {
      throw new Error(`KIS quote payload missing output for ${symbol}`)
    }

    const output = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput
    return this.normalizeQuote(symbol, output)
  }

  async fetchQuotes(symbols) {
    const results = await Promise.allSettled(symbols.map((symbol) => this.fetchQuote(symbol)))

    const quotes = []
    let lastErr = null

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value)
      }

      if (result.status === 'rejected') {
        lastErr = result.reason
      }
    }

    if (!quotes.length && lastErr) {
      throw lastErr
    }

    return quotes
  }
}

class KiwoomTokenManager {
  constructor({ baseUrl, appKey, secretKey }) {
    this.baseUrl = baseUrl
    this.appKey = appKey
    this.secretKey = secretKey
    this.token = null
    this.expireAt = 0
    this.inflight = null
  }

  get configured() {
    return Boolean(this.appKey && this.secretKey)
  }

  async getToken() {
    if (this.token && Date.now() < this.expireAt) return this.token
    if (this.inflight) return this.inflight

    this.inflight = (async () => {
      const tokenUrl = new URL('/oauth2/token', this.baseUrl)

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: this.appKey,
          secretkey: this.secretKey
        })
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Kiwoom token request failed: ${response.status} ${body}`)
      }

      const payload = await response.json()

      if (payload.return_code !== undefined && Number(payload.return_code) !== 0) {
        throw new Error(`Kiwoom token api error: ${payload.return_code} ${payload.return_msg ?? ''}`)
      }

      const token = payload.token
      if (!token) {
        throw new Error(`Kiwoom token response missing token: ${JSON.stringify(payload)}`)
      }

      const expiresAt = parseKiwoomExpiry(payload.expires_dt)
      this.token = token
      this.expireAt = expiresAt ? expiresAt - 120_000 : Date.now() + 60 * 60 * 1000
      return this.token
    })()

    try {
      return await this.inflight
    } finally {
      this.inflight = null
    }
  }
}

class KiwoomMarketProvider {
  constructor({ baseUrl, appKey, secretKey }) {
    this.name = 'kiwoom'
    this.mode = KIWOOM_ENV
    this.wsRequested = false
    this.wsEnabled = false
    this.baseUrl = baseUrl
    this.tokenManager = new KiwoomTokenManager({ baseUrl, appKey, secretKey })
    this.stockInfoUrl = '/api/dostk/stkinfo'
  }

  get enabled() {
    return this.tokenManager.configured
  }

  getCommonHeaders(token) {
    return {
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'cont-yn': 'N',
      'next-key': '',
      'api-id': 'ka10001'
    }
  }

  normalizeQuote(symbol, output) {
    const code = normalizeSymbol(pickString(output, ['stk_cd', 'code']) ?? symbol)
    const displaySymbol = toDisplaySymbol(code)
    const name = pickString(output, ['stk_nm', 'name'])
    const price = absNumber(output?.cur_prc ?? output?.lastPrice ?? output?.close_pric)
    const changeAmount = toNumber(output?.pred_pre)
    const prevClose =
      price !== undefined && changeAmount !== undefined ? Math.max(1, price - changeAmount) : undefined
    const volume = pickNumber(output, ['trde_qty', 'trade_qty', 'volume'])
    const freeFloat = pickNumber(output, ['mac', 'mktcap', 'market_cap'])
    const changePct = pickNumber(output, ['flu_rt', 'chg_rt', 'change_rate'])

    return {
      symbol: displaySymbol,
      name: name || displaySymbol,
      price,
      prevClose,
      volume,
      freeFloat,
      changePct
    }
  }

  async fetchQuote(symbol) {
    if (!this.enabled) {
      return null
    }

    const token = await this.tokenManager.getToken()
    const code = normalizeSymbol(symbol)
    const url = new URL(this.stockInfoUrl, this.baseUrl)

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getCommonHeaders(token),
      body: JSON.stringify({ stk_cd: code })
    })

    if (!response.ok) {
      throw new Error(`Kiwoom quote request failed (${symbol}): ${response.status}`)
    }

    const payload = await response.json()

    if (payload.return_code !== undefined && Number(payload.return_code) !== 0) {
      throw new Error(`Kiwoom quote api error for ${symbol}: ${payload.return_code} ${payload.return_msg ?? ''}`)
    }

    return this.normalizeQuote(symbol, payload)
  }

  async fetchQuotes(symbols) {
    const results = await Promise.allSettled(symbols.map((symbol) => this.fetchQuote(symbol)))

    const quotes = []
    let lastErr = null

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value)
      }

      if (result.status === 'rejected') {
        lastErr = result.reason
      }
    }

    if (!quotes.length && lastErr) {
      throw lastErr
    }

    return quotes
  }
}

function createMarketProvider() {
  if (MARKET_DATA_PROVIDER === 'kiwoom') {
    return new KiwoomMarketProvider({
      baseUrl: KIWOOM_BASE_URL,
      appKey: KIWOOM_APP_KEY,
      secretKey: KIWOOM_SECRET_KEY
    })
  }

  return new KISMarketProvider({
    baseUrl: KIS_BASE_URL,
    appKey: KIS_APP_KEY,
    appSecret: KIS_APP_SECRET
  })
}

const app = express()
app.use(cors({ origin: parseCorsOrigins(CORS_ORIGIN) }))
app.use(express.json())
app.use(morgan('dev'))

const provider = createMarketProvider()

let stateSource = 'demo'
let lastUpdateAt = new Date().toISOString()
let lastProviderUpdateAt = null
let lastProviderError = null
let marketRows = decorateMarketRows(getDemoRows(), stateSource, lastUpdateAt)
let treemapNodes = makeTreemapNodes(marketRows)

let refreshInProgress = false

function getRealtimeMode() {
  return stateSource === provider.name ? 'polling' : 'demo'
}

function getLiveRowsFromQuotes(quotes) {
  const byCode = new Map(quotes.map((quote) => [normalizeSymbol(quote.symbol), quote]))
  const rows = getDemoRows()

  return rows.map((base) => {
    const quote = byCode.get(normalizeSymbol(base.symbol))
    const name = quote?.name || base.name
    const price = quote?.price ?? base.price
    const prevClose = quote?.prevClose ?? base.prev_close
    const volume = quote?.volume ?? base.volume
    const freeFloat =
      quote?.freeFloat === undefined ? base.free_float_mcap : normalizeKisMarketCap(quote.freeFloat, base.free_float_mcap)

    return {
      ...base,
      name,
      price,
      prev_close: prevClose,
      volume,
      free_float_mcap: freeFloat,
      change_pct: quote?.changePct !== undefined ? Number(quote.changePct.toFixed(2)) : calculateChangePct(price, prevClose)
    }
  })
}

function updateSnapshot(nextRows, source) {
  const updatedAt = new Date().toISOString()

  marketRows = decorateMarketRows(nextRows, source, updatedAt)
  treemapNodes = makeTreemapNodes(marketRows)
  stateSource = source
  lastUpdateAt = updatedAt
}

async function refreshLiveMarket() {
  if (refreshInProgress) return
  if (!provider.enabled) return

  refreshInProgress = true

  try {
    const quotes = await provider.fetchQuotes(watchlistMetadata.map((row) => row.symbol))
    const nextRows = getLiveRowsFromQuotes(quotes)
    updateSnapshot(nextRows, provider.name)
    lastProviderUpdateAt = new Date().toISOString()
    lastProviderError = null
  } catch (error) {
    lastProviderError = error instanceof Error ? error.message : String(error)
    console.error(`[${provider.name}] poll failed:`, lastProviderError)

    if (marketRows.length === 0) {
      updateSnapshot(getDemoRows(), 'demo')
    }
  } finally {
    broadcastSnapshot()
    refreshInProgress = false
  }
}

function tickDemo() {
  const nextRows = advanceDemoRows(marketRows)
  updateSnapshot(nextRows, 'demo')
  broadcastSnapshot()
}

function snapshot() {
  return {
    type: 'market.snapshot',
    provider: provider.name,
    mode: provider.mode,
    data_source: stateSource,
    realtime_mode: getRealtimeMode(),
    generated_at: lastUpdateAt,
    rows: marketRows,
    nodes: treemapNodes,
    data: marketRows.map((row) => ({
      symbol: row.symbol,
      code: row.code,
      name: row.name,
      price: row.price,
      change_pct: row.change_pct,
      volume: row.volume,
      source: row.source,
      updated_at: row.updated_at
    })),
    note:
      stateSource === 'demo'
        ? `Demo data (no ${provider.name} credentials).`
        : `${provider.name} live quote data.`
  }
}

app.get('/health', (_req, res) => {
  const now = new Date().toISOString()

  res.json({
    status: 'ok',
    provider: provider.name,
    mode: provider.mode,
    time: now,
    generated_at: now,
    data_source: stateSource,
    realtime_mode: getRealtimeMode(),
    poll_interval_ms: provider.enabled ? POLL_INTERVAL_MS : null,
    provider_configured: provider.enabled,
    ws_requested: provider.wsRequested,
    ws_enabled: provider.wsEnabled,
    kis_ws_requested: provider.name === 'kis' ? provider.wsRequested : false,
    kis_ws_enabled: provider.name === 'kis' ? provider.wsEnabled : false,
    last_provider_update_at: lastProviderUpdateAt,
    last_provider_error: lastProviderError,
    last_kis_update_at: provider.name === 'kis' ? lastProviderUpdateAt : null,
    last_kis_error: provider.name === 'kis' ? lastProviderError : null
  })
})

app.get('/market', (_req, res) => {
  res.json(marketRows)
})

app.get('/positions', (_req, res) => {
  res.json(positions)
})

app.get('/treemap', (_req, res) => {
  res.json(treemapNodes)
})

app.get('/realtime', (_req, res) => {
  res.json(snapshot())
})

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/realtime' })

function broadcastSnapshot() {
  const message = JSON.stringify(snapshot())

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message)
    }
  }
}

wss.on('connection', (socket, req) => {
  const path = req.url || ''
  if (!path.startsWith('/realtime')) {
    socket.close()
    return
  }
  socket.send(JSON.stringify(snapshot()))
})

function startPollingLoop() {
  if (!provider.enabled) return null

  return setInterval(() => {
    void refreshLiveMarket()
  }, POLL_INTERVAL_MS)
}

server.listen(PORT, async () => {
  console.log(`API running on http://localhost:${PORT}`)
  console.log(`CORS origin: ${CORS_ORIGIN}`)
  console.log(`Market data provider: ${provider.name}`)
  console.log(`Provider env: ${provider.mode}`)
  console.log(`Provider base URL: ${provider.baseUrl}`)
  console.log(`Provider enabled: ${provider.enabled ? 'true' : 'false'}`)
  if (provider.name === 'kis' && KIS_USE_WS) {
    console.log('KIS_USE_WS=true was requested, but this MVP uses KIS REST polling and exposes backend WS to the frontend.')
  }

  if (provider.enabled) {
    await refreshLiveMarket()
    startPollingLoop()
  } else {
    setInterval(() => {
      tickDemo()
    }, 1000)
  }
})
