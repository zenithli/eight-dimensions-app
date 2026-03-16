/**
 * lib/core/position.ts
 *
 * 仓位計算・止損・盈亏比 — 純粋関数
 * 移植自 calcPosition() + slFmt() + tpFmt()
 */

// ─────────────────────────────────────────
// 仓位計算
// ─────────────────────────────────────────
export interface PositionInput {
  totalAsset:   number  // 総資産
  riskPct:      number  // 許容リスク% (例: 2 = 2%)
  entryPrice:   number  // 買い価格
  stopPrice:    number  // 止損価格
  leverageRatio?: number // レバレッジ (デフォルト1)
}

export interface PositionResult {
  shares:       number   // 株数
  positionAmt:  number   // 仓位金额
  positionPct:  number   // 占用総資産%
  maxLoss:      number   // 最大損失金額
  riskRatio:    number   // 盈亏比(目標÷止損)
}

export function calcPosition(input: PositionInput): PositionResult | null {
  const { totalAsset, riskPct, entryPrice, stopPrice, leverageRatio = 1 } = input
  if (entryPrice <= 0 || stopPrice <= 0 || entryPrice <= stopPrice) return null
  if (totalAsset <= 0 || riskPct <= 0) return null

  const lossPerShare = entryPrice - stopPrice
  if (lossPerShare <= 0) return null

  const maxLoss = totalAsset * (riskPct / 100)
  const shares = Math.floor(maxLoss / lossPerShare / 100) * 100  // 100株単位
  const positionAmt = shares * entryPrice
  const positionPct = (positionAmt / (totalAsset * leverageRatio)) * 100

  return {
    shares,
    positionAmt:  +positionAmt.toFixed(0),
    positionPct:  +positionPct.toFixed(1),
    maxLoss:      +maxLoss.toFixed(0),
    riskRatio:    0, // 別途target渡し
  }
}

// ─────────────────────────────────────────
// 止損・目標価格
// ─────────────────────────────────────────
export function calcStopLoss(
  cost: number,
  price: number,
  pct = 0.08
): number {
  const base = cost > 0 ? cost : price
  return +((base * (1 - pct)).toFixed(2))
}

export function calcTarget(
  cost: number,
  price: number,
  pct = 0.15
): number {
  const base = cost > 0 ? cost : price
  return +((base * (1 + pct)).toFixed(2))
}

// ─────────────────────────────────────────
// 盈亏比
// ─────────────────────────────────────────
export function calcRiskReward(
  entry:  number,
  stop:   number,
  target: number
): string {
  const risk   = entry - stop
  const reward = target - entry
  if (risk <= 0 || reward <= 0) return '—'
  return `1:${(reward / risk).toFixed(1)}`
}

// ─────────────────────────────────────────
// 3+2+1 戦術ルールの仓位上限
// ⑧乖離に基づく建仓比率
// ─────────────────────────────────────────
export function getMaxPositionByBias(biasVal: number): {
  maxPct: number
  stopPct: number
  rule: string
} {
  if (biasVal > 35) return { maxPct: 0,   stopPct: 0,   rule: '一票否决：禁止建仓' }
  if (biasVal > 30) return { maxPct: 0.30, stopPct: 0.05, rule: '最多30%试仓，止损-5%' }
  if (biasVal > 25) return { maxPct: 0.30, stopPct: 0.05, rule: '最多30%试仓，止损-5%' }
  if (biasVal > 20) return { maxPct: 0.60, stopPct: 0.06, rule: '最多60%建仓，止损-6%' }
  return               { maxPct: 1.00, stopPct: 0.08, rule: '正常三步建仓，止损-8%' }
}
