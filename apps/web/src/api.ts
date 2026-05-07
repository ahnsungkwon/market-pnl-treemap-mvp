import type {
  DataSourceHint,
  HealthResponse,
  MarketResponse,
  MarketRow,
  Position,
  PositionResponse,
  SnapshotMessage,
  TreemapNode,
  TreemapResponse
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const WS_URL = import.meta.env.VITE_WS_URL?.trim() ?? ''

const normalizedApiBase = API_BASE.replace(/\/+$/, '')

export function hasApiBaseUrl() {
  return Boolean(normalizedApiBase)
}

function apiUrl(path: string) {
  if (!normalizedApiBase) throw new Error('VITE_API_BASE_URL is not configured')
  return `${normalizedApiBase}${path.startsWith('/') ? '' : '/'}${path}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Request failed (${response.status}): ${text}`)
  }

  return response.json()
}

function newestTimestamp(rows: Array<{ updated_at?: string }>) {
  const timestamps = rows
    .map((row) => row.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort()

  return timestamps[timestamps.length - 1] ?? new Date().toISOString()
}

function inferDataSource(rows: Array<{ source?: DataSourceHint }>) {
  return rows.find((row) => row.source)?.source
}

function normalizeMarketResponse(payload: MarketResponse | MarketRow[]): MarketResponse {
  if (!Array.isArray(payload)) return payload

  return {
    generated_at: newestTimestamp(payload),
    data_source: inferDataSource(payload),
    rows: payload
  }
}

function normalizeTreemapResponse(payload: TreemapResponse | TreemapNode[]): TreemapResponse {
  if (!Array.isArray(payload)) return payload

  return {
    generated_at: newestTimestamp(payload),
    data_source: inferDataSource(payload),
    nodes: payload
  }
}

function normalizePositionResponse(payload: PositionResponse | Position[]): PositionResponse {
  if (!Array.isArray(payload)) return payload

  return {
    generated_at: new Date().toISOString(),
    positions: payload
  }
}

export function getWsUrl() {
  if (!WS_URL) return null

  try {
    const ws = new URL(WS_URL)

    if (ws.pathname === '/' || ws.pathname === '') {
      ws.pathname = '/realtime'
    }

    ws.search = ''
    ws.hash = ''
    return ws.toString().replace(/\/+$/, '')
  } catch {
    const normalized = WS_URL.replace(/\/+$/, '')
    return normalized.includes('/realtime') ? normalized : `${normalized}/realtime`
  }
}

export function getRealtimePollUrl() {
  return normalizedApiBase ? `${normalizedApiBase}/realtime` : null
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>(apiUrl('/health'))
}

export async function fetchMarket(): Promise<MarketResponse> {
  const payload = await fetchJson<MarketResponse | MarketRow[]>(apiUrl('/market'))
  return normalizeMarketResponse(payload)
}

export async function fetchTreemap(): Promise<TreemapResponse> {
  const payload = await fetchJson<TreemapResponse | TreemapNode[]>(apiUrl('/treemap'))
  return normalizeTreemapResponse(payload)
}

export async function fetchPositions(): Promise<PositionResponse> {
  const payload = await fetchJson<PositionResponse | Position[]>(apiUrl('/positions'))
  return normalizePositionResponse(payload)
}

export async function fetchRealtimeSnapshot(): Promise<SnapshotMessage> {
  return fetchJson<SnapshotMessage>(apiUrl('/realtime'))
}
