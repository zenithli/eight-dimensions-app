'use server'

// src/app/actions/signal-track.ts
// 信号検証追跡 + 止損帰因分析

import { db } from '@/lib/db'

function requireDb() {
  if (!db) throw new Error('DATABASE_URL が設定されていません')
  return db
}

// ── 分析時に信号を記録 ──
export async function recordSignal(data: {
  code:         string
  name:         string
  signal:       string
  bScore:       number
  triggerPrice: number
  marketState?: string
  shIndexPct?:  number
}): Promise<number> {
  const client = requireDb()
  const row = await client.signalTrack.create({
    data: {
      code:         data.code,
      name:         data.name,
      signal:       data.signal,
      bScore:       data.bScore,
      triggerPrice: data.triggerPrice,
      marketState:  data.marketState,
      shIndexPct:   data.shIndexPct,
      outcome:      'open',  // まだ結果不明
    },
  })
  return row.id
}

// ── 信号の結果を更新（出口価格が確定したとき）──
export async function updateSignalOutcome(
  id: number,
  exitPrice: number,
  note?: string
): Promise<void> {
  const client = requireDb()
  const row = await client.signalTrack.findUnique({ where: { id } })
  if (!row) throw new Error(`SignalTrack id=${id} が見つかりません`)

  const actualReturn = +((exitPrice - row.triggerPrice) / row.triggerPrice * 100).toFixed(2)
  const outcome =
    actualReturn > 1.0  ? 'win' :
    actualReturn < -1.0 ? 'loss' : 'breakeven'

  await client.signalTrack.update({
    where: { id },
    data: {
      exitPrice,
      exitDate:     new Date(),
      actualReturn,
      outcome,
      ...(note ? { note } : {}),
    },
  })
}

// ── 検証統計を取得 ──
export async function getSignalStats(days = 90): Promise<{
  total:      number
  wins:       number
  losses:     number
  open:       number
  winRate:    number
  avgReturn:  number
  bySignal:   Record<string, { total: number; wins: number }>
  byMarket:   Record<string, { total: number; wins: number }>
}> {
  const client = requireDb()
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  const rows = await client.signalTrack.findMany({
    where: { triggerDate: { gte: since } },
    orderBy: { triggerDate: 'desc' },
  })

  const closed = rows.filter(r => r.outcome && r.outcome !== 'open')
  const wins   = closed.filter(r => r.outcome === 'win').length
  const losses = closed.filter(r => r.outcome === 'loss').length
  const open   = rows.filter(r => r.outcome === 'open').length

  const avgReturn = closed.length > 0
    ? +(closed.reduce((s, r) => s + (r.actualReturn ?? 0), 0) / closed.length).toFixed(2)
    : 0

  // シグナル別集計
  const bySignal: Record<string, { total: number; wins: number }> = {}
  for (const r of closed) {
    const k = r.signal
    if (!bySignal[k]) bySignal[k] = { total: 0, wins: 0 }
    bySignal[k].total++
    if (r.outcome === 'win') bySignal[k].wins++
  }

  // 大盤状態別集計
  const byMarket: Record<string, { total: number; wins: number }> = {}
  for (const r of closed) {
    const k = r.marketState ?? 'unknown'
    if (!byMarket[k]) byMarket[k] = { total: 0, wins: 0 }
    byMarket[k].total++
    if (r.outcome === 'win') byMarket[k].wins++
  }

  return {
    total:     rows.length,
    wins,
    losses,
    open,
    winRate:   closed.length > 0 ? +(wins / closed.length * 100).toFixed(1) : 0,
    avgReturn,
    bySignal,
    byMarket,
  }
}

// ── 止損イベントを記録 ──
export async function recordStopLoss(data: {
  code:          string
  name:          string
  entryPrice:    number
  stopPrice:     number
  exitPrice:     number
  shIndexPct?:   number
  stockPct?:     number
  bScoreAtEntry?: number
  bScoreAtStop?: number
  note?:         string
}): Promise<void> {
  const client = requireDb()

  // 帰因自動判定
  let causeType = 'unknown'
  if (data.shIndexPct !== undefined && data.stockPct !== undefined) {
    const shAbs    = Math.abs(data.shIndexPct)
    const stockAbs = Math.abs(data.stockPct)

    if (data.shIndexPct < -1.5 && stockAbs <= shAbs * 1.3) {
      causeType = 'systematic'       // 大盤全体の下落
    } else if (data.shIndexPct > -0.5 && data.stockPct < -3) {
      causeType = 'stock-specific'   // 大盤正常だが个股大跌
    }
  }

  const lossRate = +((data.exitPrice - data.entryPrice) / data.entryPrice * 100).toFixed(2)

  await client.stopLossEvent.create({
    data: {
      code:          data.code,
      name:          data.name,
      entryPrice:    data.entryPrice,
      stopPrice:     data.stopPrice,
      exitPrice:     data.exitPrice,
      lossRate,
      causeType,
      shIndexPct:    data.shIndexPct,
      stockPct:      data.stockPct,
      bScoreAtEntry: data.bScoreAtEntry,
      bScoreAtStop:  data.bScoreAtStop,
      note:          data.note ?? '',
    },
  })
}

// ── 止損帰因統計を取得 ──
export async function getStopLossStats(): Promise<{
  total:       number
  systematic:  number
  stockSpec:   number
  unknown:     number
  avgLoss:     number
}> {
  const client = requireDb()
  const rows = await client.stopLossEvent.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return {
    total:      rows.length,
    systematic: rows.filter(r => r.causeType === 'systematic').length,
    stockSpec:  rows.filter(r => r.causeType === 'stock-specific').length,
    unknown:    rows.filter(r => r.causeType === 'unknown').length,
    avgLoss:    rows.length > 0
      ? +(rows.reduce((s, r) => s + r.lossRate, 0) / rows.length).toFixed(2)
      : 0,
  }
}
