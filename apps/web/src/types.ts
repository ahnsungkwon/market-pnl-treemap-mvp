export type MarketRow = {
  symbol: string
  name: string
  sector: string
  price: number
  prev_close: number
  change_pct: number
  volume: number
  free_float_mcap: number
}

export type TreemapNode = {
  id: string
  label: string
  sector: string
  value: number
  price: number
  change_pct: number
  qty: number
  avg_price: number
  pnl_amount: number
  pnl_pct: number
}

export type MarketResponse = {
  generated_at: string
  rows: MarketRow[]
}

export type TreemapResponse = {
  generated_at: string
  nodes: TreemapNode[]
}

export type SnapshotMessage = {
  type: 'market.snapshot'
  generated_at: string
  rows: MarketRow[]
  nodes: TreemapNode[]
}
