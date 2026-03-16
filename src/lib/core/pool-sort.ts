/**
 * lib/core/pool-sort.ts
 *
 * 自選株池のソート・フィルタ・月度轮换判定 — 純粋関数
 * 移植自 renderPool() / calcRotation() の計算ロジック
 */

import { calcBScore, getBiasLevel, getBSignal } from './b-score'
import type { BScoreInput } from './b-score'

// ─────────────────────────────────────────
// 自選株の表示用集計
// ─────────────────────────────────────────
export type StockTier = 'core' | 'steady' | 'defense' | 'watch'

export interface PoolStockRaw {
  code:     string
  name:     string
  tier:     StockTier
  cost:     number
  addDate:  string
  price:    number
  chg:      number
  d3:       number
  d6:       number
  m1:       number
  mon:      number
  volr:     number
  ma20Bias?: number | null
  bScore?:  number  // 計算済みならそのまま使う
  dataMode?: string
  updatedAt?: string
}

export interface PoolStockView extends PoolStockRaw {
  bResult:       ReturnType<typeof calcBScore>
  signal:        ReturnType<typeof getBSignal>
  biasLevel:     ReturnType<typeof getBiasLevel>
  stopLoss:      number
  targetPrice:   number
  biasIsReal:    boolean
}

// 表示用に B分・シグナル・乖離等級を付加
export function enrichPoolStock(s: PoolStockRaw): PoolStockView {
  const input: BScoreInput = {
    price: s.price, chg: s.chg, d3: s.d3, d6: s.d6,
    mon: s.mon, m1: s.m1, volr: s.volr, ma20Bias: s.ma20Bias,
  }
  const bResult   = calcBScore(input)
  const signal    = getBSignal(bResult.total)
  const biasVal   = s.ma20Bias ?? s.m1 ?? 0
  const biasLevel = getBiasLevel(biasVal)
  const base      = s.cost > 0 ? s.cost : s.price
  const stopLoss  = +(base * 0.92).toFixed(2)
  const targetPrice = +(base * 1.15).toFixed(2)

  return {
    ...s,
    bScore: bResult.total,
    bResult,
    signal,
    biasLevel,
    stopLoss,
    targetPrice,
    biasIsReal: s.ma20Bias !== undefined && s.ma20Bias !== null,
  }
}

// ─────────────────────────────────────────
// ソート
// ─────────────────────────────────────────
export type SortKey = 'bScore' | 'biasVal' | 'chg' | 'd6' | 'm1' | 'name'
export type SortDir = 'asc' | 'desc'

export function sortPool(
  stocks: PoolStockView[],
  key: SortKey = 'bScore',
  dir: SortDir = 'desc'
): PoolStockView[] {
  return [...stocks].sort((a, b) => {
    let va: number | string
    let vb: number | string

    switch (key) {
      case 'bScore':  va = a.bScore ?? 0;    vb = b.bScore ?? 0;    break
      case 'biasVal': va = a.ma20Bias ?? a.m1 ?? 0; vb = b.ma20Bias ?? b.m1 ?? 0; break
      case 'chg':     va = a.chg;             vb = b.chg;             break
      case 'd6':      va = a.d6;              vb = b.d6;              break
      case 'm1':      va = a.m1;              vb = b.m1;              break
      case 'name':    va = a.name;            vb = b.name;            break
      default:        va = a.bScore ?? 0;     vb = b.bScore ?? 0
    }

    if (typeof va === 'string' && typeof vb === 'string') {
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return dir === 'desc'
      ? (vb as number) - (va as number)
      : (va as number) - (vb as number)
  })
}

// ─────────────────────────────────────────
// フィルター
// ─────────────────────────────────────────
export function filterPool(
  stocks: PoolStockView[],
  tier: StockTier | 'all'
): PoolStockView[] {
  return tier === 'all' ? stocks : stocks.filter((s) => s.tier === tier)
}

// ─────────────────────────────────────────
// 月度轮换：退出候補判定
// 移植自 calcRotation()
// ─────────────────────────────────────────
export interface RotationJudge {
  code:       string
  name:       string
  tier:       string
  bScore:     number
  exitScore:  number    // 高いほど退出候補
  reasons:    string[]
  action:     '建议换出' | '观察' | '保留'
}

export function judgeRotation(stocks: PoolStockView[]): RotationJudge[] {
  return stocks.map((s) => {
    const b = s.bScore ?? 0
    const bias = s.ma20Bias ?? s.m1 ?? 0
    const reasons: string[] = []
    let exitScore = 0

    if (b < 3.5)      { reasons.push(`B分${b.toFixed(2)}<3.5`);         exitScore += 3 }
    else if (b < 4.0) { reasons.push(`B分偏低${b.toFixed(2)}`);          exitScore += 1 }
    if (bias > 40)    { reasons.push(`乖离${bias.toFixed(1)}%过热`);      exitScore += 2 }
    if (s.chg < -3)   { reasons.push(`今日跌幅${s.chg.toFixed(1)}%`);    exitScore += 1 }

    const action: RotationJudge['action'] =
      exitScore >= 3 ? '建议换出' : exitScore >= 1 ? '观察' : '保留'

    return {
      code: s.code, name: s.name, tier: s.tier,
      bScore: b, exitScore, reasons, action,
    }
  }).sort((a, b) => b.exitScore - a.exitScore)
}

// ─────────────────────────────────────────
// 統計サマリー
// ─────────────────────────────────────────
export interface PoolSummary {
  total:    number
  byTier:   Record<StockTier, number>
  avgB:     number
  strongCount: number  // B≥4.5
  dangerCount: number  // B<3.5 or bias>35
}

export function calcPoolSummary(stocks: PoolStockView[]): PoolSummary {
  const byTier: Record<StockTier, number> = {
    core: 0, steady: 0, defense: 0, watch: 0,
  }
  let sumB = 0
  let strongCount = 0
  let dangerCount = 0

  for (const s of stocks) {
    byTier[s.tier] = (byTier[s.tier] || 0) + 1
    sumB += s.bScore ?? 0
    if ((s.bScore ?? 0) >= 4.5) strongCount++
    if ((s.bScore ?? 0) < 3.5 || (s.ma20Bias ?? s.m1 ?? 0) > 35) dangerCount++
  }

  return {
    total: stocks.length,
    byTier,
    avgB: stocks.length > 0 ? +(sumB / stocks.length).toFixed(2) : 0,
    strongCount,
    dangerCount,
  }
}
