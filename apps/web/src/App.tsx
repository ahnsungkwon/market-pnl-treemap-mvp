import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, Treemap } from 'recharts'
import {
  fetchHealth,
  fetchMarket,
  fetchRealtimeSnapshot,
  fetchTreemap,
  getRealtimePollUrl,
  getWsUrl,
  hasApiBaseUrl
} from './api'
import { advanceDemoSnapshot, getDemoSnapshot } from './demoData'
import type { MarketRow, SnapshotMessage, TreemapNode } from './types'

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatKrw(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0
  }).format(value)
}

function formatCompactKrw(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

type ConnectionState = 'connecting' | 'live' | 'polling' | 'static'
type RealtimeMode = 'polling' | 'demo' | 'ws' | ''

type TileProps = {
  x: number
  y: number
  width: number
  height: number
  name: string
  pnl_pct: number
  price: number
}

function TreemapTile(props: TileProps) {
  const { x, y, width, height, name, pnl_pct, price } = props
  const isPositive = pnl_pct >= 0
  const fill = isPositive ? '#15803d' : '#b91c1c'
  const textVisible = width > 80 && height > 45

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} ry={8} fill={fill} opacity={0.86} stroke="#0f172a" />
      {textVisible ? (
        <>
          <text x={x + 10} y={y + 22} fill="#fff" fontSize={13} fontWeight={700}>
            {name}
          </text>
          <text x={x + 10} y={y + 42} fill="#f8fafc" fontSize={12}>
            {formatKrw(price)} · {pnl_pct.toFixed(2)}%
          </text>
        </>
      ) : null}
    </g>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}

function formatPollIntervalLabel(intervalMs: number) {
  const intervalSec = Math.max(1, Math.round(intervalMs / 1000))
  return `${intervalSec}s`
}

function connectionText(
  connection: ConnectionState,
  pollIntervalMs: number,
  dataSource?: string,
  realtimeMode?: RealtimeMode
) {
  const isDemo = dataSource === 'demo'

  if (isDemo || connection === 'static') return 'Demo data · not live market price'
  if (dataSource === 'kis' || dataSource === 'kiwoom') {
    const providerLabel = dataSource === 'kiwoom' ? 'Kiwoom' : 'KIS'

    if (realtimeMode === 'polling' || connection === 'polling') {
      return `${providerLabel} live polling (${formatPollIntervalLabel(pollIntervalMs)})`
    }

    return `${providerLabel} live`
  }
  if (connection === 'polling') return `Live market data polling (${formatPollIntervalLabel(pollIntervalMs)})`
  if (connection === 'live') return 'Live market data'
  return 'Connecting'
}

export default function App() {
  const [market, setMarket] = useState<MarketRow[]>([])
  const [nodes, setNodes] = useState<TreemapNode[]>([])
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [error, setError] = useState<string>('')
  const [pollIntervalMs, setPollIntervalMs] = useState(15000)
  const [realtimeMode, setRealtimeMode] = useState<RealtimeMode>('')

  const wsRef = useRef<WebSocket | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const demoTimerRef = useRef<number | null>(null)
  const wsFallbackTimerRef = useRef<number | null>(null)
  const pollIntervalRef = useRef<number>(pollIntervalMs)

  const [dataSource, setDataSource] = useState<string>('')

  function syncPollInterval(nextPollIntervalMs: number) {
    const clamped = Math.max(1000, Math.floor(nextPollIntervalMs))
    pollIntervalRef.current = clamped
    setPollIntervalMs(clamped)
  }

  function stopDemoMode() {
    if (demoTimerRef.current !== null) {
      window.clearInterval(demoTimerRef.current)
      demoTimerRef.current = null
    }
  }

  function stopPolling() {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  function stopWebSocket() {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (wsFallbackTimerRef.current !== null) {
      window.clearTimeout(wsFallbackTimerRef.current)
      wsFallbackTimerRef.current = null
    }
  }

  function applySnapshot(message: SnapshotMessage) {
    setMarket(message.rows)
    setNodes(message.nodes)
    setUpdatedAt(message.generated_at)

    if (message.data_source) {
      setDataSource(message.data_source)
    }

    if (message.realtime_mode) {
      setRealtimeMode(message.realtime_mode)
    }

    setError('')
  }

  function startDemoFallback() {
    setConnection('static')
    setDataSource('demo')
    setRealtimeMode('demo')
    setError('API disconnected: Demo data · not live market price')
    stopWebSocket()
    stopPolling()

    if (demoTimerRef.current !== null) {
      return
    }

    const now = getDemoSnapshot()
    setMarket(now.rows)
    setNodes(now.nodes)
    setUpdatedAt(now.generated_at)

    demoTimerRef.current = window.setInterval(() => {
      const snapshot = advanceDemoSnapshot()
      applySnapshot(snapshot)
    }, 1000)
  }

  function startPollingFallback(nextPollIntervalMs?: number) {
    const pollUrl = getRealtimePollUrl()
    if (!pollUrl) {
      startDemoFallback()
      return
    }

    const normalizedPollInterval = Math.max(1000, Math.floor(nextPollIntervalMs ?? pollIntervalRef.current))

    setConnection('polling')
    setRealtimeMode((prev) => (prev === 'demo' ? 'demo' : 'polling'))
    setError((prev) =>
      prev ||
      `${dataSource === 'demo' ? 'Demo' : 'WebSocket'}가 연결되지 않아 ${dataSource === 'demo' ? 'demo' : '실시간'} polling(${formatPollIntervalLabel(normalizedPollInterval)})으로 전환합니다.`
    )
    stopDemoMode()

    const tick = async () => {
      try {
        const snapshot = await fetchRealtimeSnapshot()
        applySnapshot(snapshot)
      } catch (pollError) {
        setError(`폴링 오류: ${pollError instanceof Error ? pollError.message : 'unknown error'}`)
      }
    }

    void tick()

    if (pollTimerRef.current === null) {
      pollTimerRef.current = window.setInterval(tick, normalizedPollInterval)
    }

    stopWebSocket()
  }

  function startRealtimeChannel() {
    const wsUrl = getWsUrl()

    if (!wsUrl) {
      startPollingFallback()
      return
    }

    stopPolling()

    setConnection('connecting')

    const socket = new WebSocket(wsUrl)
    wsRef.current = socket

    wsFallbackTimerRef.current = window.setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        socket.close()
        startPollingFallback()
      }
    }, 5000)

    socket.onopen = () => {
      if (wsFallbackTimerRef.current !== null) {
        window.clearTimeout(wsFallbackTimerRef.current)
        wsFallbackTimerRef.current = null
      }

      setConnection('live')
      setError('')
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SnapshotMessage
        if (message.type !== 'market.snapshot') return
        applySnapshot(message)
      } catch {
        setError('WS 메시지 파싱 실패: 데이터 형식이 올바르지 않습니다.')
      }
    }

    socket.onerror = () => {
      startPollingFallback()
    }

    socket.onclose = () => {
      wsRef.current = null
      if (hasApiBaseUrl()) {
        startPollingFallback(pollIntervalRef.current)
      }
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadInitialData() {
      if (!hasApiBaseUrl()) {
        startDemoFallback()
        return
      }

      try {
        const [marketResponse, treemapResponse, health] = await Promise.all([
          fetchMarket(),
          fetchTreemap(),
          fetchHealth()
        ])

        if (!mounted) return

        setMarket(marketResponse.rows)
        setNodes(treemapResponse.nodes)
        setUpdatedAt(marketResponse.generated_at)

        const nextSource = marketResponse.data_source || health.data_source
        setDataSource(nextSource)
        setRealtimeMode(health.realtime_mode ?? '')
        syncPollInterval(health.poll_interval_ms ?? 15000)
        setConnection('connecting')
        setError('')

        startRealtimeChannel()
      } catch (nextError) {
        if (!mounted) return
        startDemoFallback()
      }
    }

    loadInitialData()

    return () => {
      mounted = false
      stopDemoMode()
      stopPolling()
      stopWebSocket()
    }
  }, [])

  const sortedMarket = useMemo(
    () => [...market].sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct)),
    [market]
  )

  const exposure = useMemo(() => nodes.reduce((sum, node) => sum + node.price * node.qty, 0), [nodes])

  const totalPnl = useMemo(() => nodes.reduce((sum, node) => sum + node.pnl_amount, 0), [nodes])

  const advancing = useMemo(() => market.filter((row) => row.change_pct >= 0).length, [market])

  const treemapData = useMemo(() => nodes.map((node) => ({ ...node, name: node.label, size: node.value })), [nodes])

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">1-minute market dashboard</p>
          <h1>Market P&L Treemap MVP</h1>
          <p className="subtitle">시가총액 트리맵 위에 내 포지션 손익을 실시간으로 오버레이합니다.</p>
        </div>
        <div className={`connection connection-${connection}`}>
          <span />
          <div>
            <p>{connectionText(connection, pollIntervalMs, dataSource, realtimeMode)}</p>
            <small>
              {dataSource ? `source: ${dataSource}` : 'source unknown'}
              {realtimeMode ? ` · mode: ${realtimeMode}` : ''}
            </small>
          </div>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="stats-grid">
        <StatCard label="Watchlist" value={`${market.length} symbols`} hint={`${advancing} advancing`} />
        <StatCard label="Exposure" value={formatKrw(exposure)} hint="positions overlay" />
        <StatCard label="Total P&L" value={formatKrw(totalPnl)} hint={totalPnl >= 0 ? 'positive' : 'negative'} />
        <StatCard
          label="Updated"
          value={updatedAt ? new Date(updatedAt).toLocaleTimeString('ko-KR') : '-'}
          hint={
            connection === 'polling'
              ? `polling (${formatPollIntervalLabel(pollIntervalMs)})`
              : connection === 'live'
                ? 'WS'
                : connection === 'static'
                  ? 'demo mode'
                  : 'loading'
          }
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel treemap-panel">
          <div className="panel-header">
            <div>
              <h2>P&L Treemap</h2>
              <p>면적 = free-float mcap, 색상 = P&L%</p>
            </div>
          </div>
          <div className="treemap-box">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                nameKey="name"
                aspectRatio={4 / 3}
                content={<TreemapTile x={0} y={0} width={0} height={0} name="" pnl_pct={0} price={0} />}
              />
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Market Snapshot</h2>
              <p>등락률 절대값 기준 정렬</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {sortedMarket.map((row) => (
                  <tr key={row.symbol}>
                    <td>
                      <strong>{row.symbol}</strong>
                      <span>{row.name}</span>
                    </td>
                    <td>{formatKrw(row.price)}</td>
                    <td className={row.change_pct >= 0 ? 'positive' : 'negative'}>{row.change_pct.toFixed(2)}%</td>
                    <td>{formatNumber(row.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="panel positions-panel">
        <div className="panel-header">
          <div>
            <h2>Positions Overlay</h2>
            <p>mock position 기준 P&L 계산</p>
          </div>
        </div>
        <div className="positions-grid">
          {nodes
            .filter((node) => node.qty > 0)
            .map((node) => (
              <div className="position-card" key={node.id}>
                <div>
                  <strong>{node.label}</strong>
                  <span>{node.id}</span>
                </div>
                <div>
                  <span>Qty {formatNumber(node.qty)}</span>
                  <span>Avg {formatKrw(node.avg_price)}</span>
                </div>
                <div className={node.pnl_pct >= 0 ? 'positive' : 'negative'}>
                  {formatKrw(node.pnl_amount)} · {node.pnl_pct.toFixed(2)}%
                </div>
                <small>Value {formatCompactKrw(node.value)}</small>
              </div>
            ))}
        </div>
      </section>
    </main>
  )
}
