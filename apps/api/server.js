const express = require('express')
const app = express()

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/market', (req, res) => {
  res.json([
    { symbol: '005930.KS', price: 65800, change_pct: 1.2 },
    { symbol: '000660.KS', price: 120000, change_pct: -0.5 }
  ])
})

app.get('/treemap', (req, res) => {
  res.json([
    { id: '005930.KS', value: 100, pnl_pct: 1.2 },
    { id: '000660.KS', value: 60, pnl_pct: -0.5 }
  ])
})

app.listen(3001, () => console.log('API running'))
