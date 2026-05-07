export type MarketRow = {
  symbol: string
  code?: string
  name: string
  sector: string
  price: number
  prev_close: number
  change_pct: number
  volume: number
  free_float_mcap: number
  source?: DataSourceHint
  updated_at?: string
}

export type TreemapNode = {
  id: string
  symbol?: string
  name?: string
  label: string
  sector: string
  value: number
  price: number
  change_pct: number
  qty: number
  avg_price: number
  pnl_amount: number
  pnl_pct: number
  source?: DataSourceHint
  updated_at?: string
}

export type DataSourceHint = 'kis' | 'kiwoom' | 'demo'

export type MarketResponse = {
  generated_at: string
  data_source?: DataSourceHint
  rows: MarketRow[]
}

export type TreemapResponse = {
  generated_at: string
  data_source?: DataSourceHint
  nodes: TreemapNode[]
}

export type SnapshotMessage = {
  type: 'market.snapshot'
  provider?: string
  mode?: string
  data_source?: DataSourceHint | 'degraded'
  realtime_mode?: 'polling' | 'demo' | 'ws'
  generated_at: string
  rows: MarketRow[]
  nodes: TreemapNode[]
  data?: Array<Pick<MarketRow, 'symbol' | 'name' | 'price' | 'change_pct' | 'volume' | 'source' | 'updated_at'> & { code?: string }>
  note?: string
}

export type Position = {
  symbol: string
  qty: number
  avg_price: number
}

export type PositionResponse = {
  generated_at: string
  data_source?: DataSourceHint
  positions: Position[]
}

export type HealthResponse = {
  status: string
  provider?: string
  mode?: string
  time?: string
  generated_at: string
  data_source: string
  realtime_mode?: 'polling' | 'demo' | 'ws'
  poll_interval_ms: number | null
  provider_configured?: boolean
  ws_requested?: boolean
  ws_enabled?: boolean
  last_provider_update_at?: string | null
  last_provider_error?: string | null
  kis_ws_requested?: boolean
  kis_ws_enabled?: boolean
  last_kis_update_at: string | null
  last_kis_error: string | null
}
