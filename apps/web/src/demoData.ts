import type { MarketRow, SnapshotMessage, TreemapNode } from './types'

type SeedMarketRow = Omit<MarketRow, 'change_pct'>

type Position = {
  symbol: string
  qty: number
  avg_price: number
}

const seedMarket: SeedMarketRow[] = [
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

const positions: Position[] = [
  { symbol: '005930.KS', qty: 100, avg_price: 65000 },
  { symbol: '000660.KS', qty: 12, avg_price: 122000 },
  { symbol: '035420.KS', qty: 8, avg_price: 181000 },
  { symbol: '051910.KS', qty: 2, avg_price: 402000 },
  { symbol: '005380.KS', qty: 5, avg_price: 239000 }
]

let market = seedMarket.map((row) => ({ ...row }))

function roundPrice(value: number) {
  return Math.max(1, Math.round(value / 100) * 100)
}

function changePct(row: SeedMarketRow) {
  return Number((((row.price - row.prev_close) / row.prev_close) * 100).toFixed(2))
}

function getPosition(symbol: string) {
  return positions.find((position) => position.symbol === symbol)
}

function toMarketRows(): MarketRow[] {
  return market.map((row) => ({
    ...row,
    change_pct: changePct(row)
  }))
}

function toTreemapNodes(): TreemapNode[] {
  return toMarketRows().map((row) => {
    const position = getPosition(row.symbol)
    const qty = position?.qty ?? 0
    const avgPrice = position?.avg_price ?? 0
    const pnlAmount = position ? Math.round((row.price - avgPrice) * qty) : 0
    const pnlPct = position ? Number((((row.price - avgPrice) / avgPrice) * 100).toFixed(2)) : 0

    return {
      id: row.symbol,
      label: row.name,
      sector: row.sector,
      value: row.free_float_mcap,
      price: row.price,
      change_pct: row.change_pct,
      qty,
      avg_price: avgPrice,
      pnl_amount: pnlAmount,
      pnl_pct: pnlPct
    }
  })
}

function tickMarket() {
  market = market.map((row) => {
    const drift = (Math.random() - 0.48) * 0.004
    const nextPrice = roundPrice(row.price * (1 + drift))
    const volumeDelta = Math.floor(Math.random() * 20000)

    return {
      ...row,
      price: nextPrice,
      volume: row.volume + volumeDelta
    }
  })
}

export function getDemoSnapshot(): SnapshotMessage {
  return {
    type: 'market.snapshot',
    generated_at: new Date().toISOString(),
    rows: toMarketRows(),
    nodes: toTreemapNodes()
  }
}

export function advanceDemoSnapshot(): SnapshotMessage {
  tickMarket()
  return getDemoSnapshot()
}
