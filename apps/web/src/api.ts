import { advanceDemoSnapshot, getDemoSnapshot } from './demoData'
import type { MarketResponse, SnapshotMessage, TreemapResponse } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim()
const WS_URL = import.meta.env.VITE_WS_URL?.trim()
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE?.trim()

export function isStaticMode() {
  return DEMO_MODE === 'static' || !API_BASE
}

export async function fetchMarket(): Promise<MarketResponse> {
  if (isStaticMode()) {
    const snapshot = getDemoSnapshot()
    return { generated_at: snapshot.generated_at, rows: snapshot.rows }
  }

  const response = await fetch(`${API_BASE}/market`)
  if (!response.ok) throw new Error(`Failed to fetch market: ${response.status}`)
  return response.json()
}

export async function fetchTreemap(): Promise<TreemapResponse> {
  if (isStaticMode()) {
    const snapshot = getDemoSnapshot()
    return { generated_at: snapshot.generated_at, nodes: snapshot.nodes }
  }

  const response = await fetch(`${API_BASE}/treemap`)
  if (!response.ok) throw new Error(`Failed to fetch treemap: ${response.status}`)
  return response.json()
}

export function getWsUrl() {
  if (isStaticMode()) return null
  return WS_URL || API_BASE?.replace(/^http/, 'ws') || null
}

export function nextStaticSnapshot(): SnapshotMessage {
  return advanceDemoSnapshot()
}
