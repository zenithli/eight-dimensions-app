/**
 * lib/core/b-score.ts
 *
 * 八维度 B 分计算 — 纯函数，无任何 DOM / localStorage 依赖
 * 移植自 eight-dimensions-v6.html の calcBFromData()
 */

// 上証6日基準涨幅（週次手動調整可、環境変数化候補）
const SH_6D_BASE = 0.45

// ─────────────────────────────────────────
// 入力型
// ─────────────────────────────────────────
export interface BScoreInput {
  price: number
  chg: number      // 当日涨跌%
  d3: number       // 3日涨幅%
  d6: number       // 6日涨幅%
  mon: number      // 本月涨幅%
  m1: number       // 近一月涨幅%（⑧乖离推算に使用、真実MA20が無い場合）
  volr: number     // 量比
  ma20Bias?: number | null  // 真実MA20乖离率（あれば優先、なければm1で推算）
}

// ─────────────────────────────────────────
// 出力型
// ─────────────────────────────────────────
export interface BScoreResult {
  total: number          // 综合B分 0–5
  trend: number          // ①趋势共振 0–5
  volume: number         // ②量能加速 1–5
  alpha: number          // ③Alpha超额 1–5
  biasUsed: number       // 実際に使用した乖离值
  biasSource: 'ma20' | 'm1' // 乖离值のソース
}

// ─────────────────────────────────────────
// B分計算
// ─────────────────────────────────────────
export function calcBScore(input: BScoreInput): BScoreResult {
  const { chg, d3, d6, mon, m1, volr, ma20Bias } = input

  // ① 趋势共振（权重×2）: 5軸判断
  const conds = [
    chg > 0,
    (d3  ?? 0) > 0,
    (d6  ?? 0) > 0,
    (mon ?? 0) > 0,
    (m1  ?? 0) > 0,
  ]
  const trend = (conds.filter(Boolean).length / 5) * 5

  // ② 量能加速
  let volume = 2.5
  if      (chg > 0  && volr >= 2.0) volume = 5.0
  else if (chg > 0  && volr >= 1.5) volume = 4.5
  else if (chg > 0  && volr >= 1.2) volume = 4.0
  else if (chg > 0               )  volume = 3.0
  else if (chg <= 0 && volr >= 1.5) volume = 1.5
  else if (chg <= 0 && volr >= 1.2) volume = 2.0

  // ③ Alpha超额
  const alphaRaw = (d6 ?? 0) - SH_6D_BASE
  let alpha = 1.0
  if      (alphaRaw >= 8)  alpha = 5.0
  else if (alphaRaw >= 4)  alpha = 4.5
  else if (alphaRaw >= 2)  alpha = 4.0
  else if (alphaRaw >= 0)  alpha = 3.0
  else if (alphaRaw >= -2) alpha = 2.0

  // 基礎 B 分
  let total = +((trend * 2 + volume + alpha) / 4).toFixed(2)

  // ⑧ 乖离率制御
  // 真実MA20乖离を優先、なければ近一月涨幅(m1)で推算
  const biasSource: 'ma20' | 'm1' =
    ma20Bias !== undefined && ma20Bias !== null ? 'ma20' : 'm1'
  const biasUsed = biasSource === 'ma20' ? (ma20Bias as number) : (m1 ?? 0)

  if      (biasUsed > 35)              total = 0        // 一票否决
  else if (biasUsed > 30)              total -= 0.28
  else if (biasUsed > 25)              total -= 0.18
  else if (biasUsed > 20)              total -= 0.08
  else if (biasUsed > 0 && biasUsed <= 10) total += 0.05  // 低乖離ボーナス

  return {
    total:  +Math.max(0, total).toFixed(2),
    trend:  +trend.toFixed(2),
    volume: +volume.toFixed(2),
    alpha:  +alpha.toFixed(2),
    biasUsed,
    biasSource,
  }
}

// ─────────────────────────────────────────
// ⑧乖離等級
// ─────────────────────────────────────────
export interface BiasLevel {
  label:    string
  color:    string  // CSS変数名 or hex
  action:   string  // 建仓建议
  severity: 0 | 1 | 2 | 3 | 4 | 5  // 0=safe → 5=forbidden
}

export function getBiasLevel(bias: number): BiasLevel {
  if (bias > 35) return { label: '⛔ >35%',   color: '#ff3a6e', action: '禁止建仓',   severity: 5 }
  if (bias > 30) return { label: '⚠ 30~35%', color: '#ff8c2a', action: '最多30%试仓，止损-5%', severity: 4 }
  if (bias > 25) return { label: '⚠ 25~30%', color: '#ff8c2a', action: '最多30%试仓，止损-5%', severity: 3 }
  if (bias > 20) return { label: '⚡ 20~25%', color: '#f7c948', action: '最多60%建仓，止损-6%', severity: 2 }
  if (bias > 10) return { label: '✓ 10~20%', color: '#38c8ff', action: '正常三步建仓，止损-8%', severity: 1 }
  if (bias > 0)  return { label: '★ <10%',   color: '#00e87a', action: '最佳入场，止损-8%',    severity: 0 }
  return           { label: '—',          color: '#3a5a78', action: '',              severity: 0 }
}

// ─────────────────────────────────────────
// B分シグナル
// ─────────────────────────────────────────
export interface BSignal {
  label:  string
  color:  string
  tier:   'strong' | 'ok' | 'watch' | 'exit' | 'none'
}

export function getBSignal(b: number): BSignal {
  if (b >= 4.5) return { label: `${b.toFixed(2)} ★`, color: '#00e87a', tier: 'strong' }
  if (b >= 4.0) return { label: `${b.toFixed(2)} ☆`, color: '#38c8ff', tier: 'ok'     }
  if (b >= 3.5) return { label: `${b.toFixed(2)} ⚠`, color: '#f7c948', tier: 'watch'  }
  if (b > 0)    return { label: `${b.toFixed(2)} ✕`, color: '#ff3a6e', tier: 'exit'   }
  return               { label: '—',                  color: '#3a5a78', tier: 'none'   }
}

// ══════════════════════════════════════════════
// 大盘状态 × 震荡市フィルター
// ══════════════════════════════════════════════

export type MarketState = 'strong' | 'sideways' | 'weak'

export interface MarketFilter {
  state:          MarketState
  label:          string        // 强势 / 震荡 / 弱势
  color:          string
  bThreshold:     number        // 最低B分阈値（通常4.0、震荡4.3、弱势4.5）
  positionRatio:  number        // 仓位系数（1.0 / 0.7 / 0.5）
  warning:        string        // 操作提示
}

/**
 * 大盘MA20の傾きから市場状態を判定
 * @param ma20Values 直近5日のMA20値（古い順）
 */
export function calcMarketState(ma20Values: number[]): MarketFilter {
  if (ma20Values.length < 5) {
    return {
      state: 'sideways', label: '数据不足',
      color: 'var(--y)', bThreshold: 4.3, positionRatio: 0.8,
      warning: '大盘MA20数据不足，建议保守操作',
    }
  }

  // 5日MA20の傾き：最新 vs 5日前
  const oldest = ma20Values[0]
  const newest = ma20Values[ma20Values.length - 1]
  const slope  = oldest > 0 ? (newest - oldest) / oldest * 100 : 0

  // 3日連続上昇かどうか
  const last3Up = ma20Values.slice(-3).every((v, i, arr) =>
    i === 0 || v > arr[i - 1]
  )
  const last3Down = ma20Values.slice(-3).every((v, i, arr) =>
    i === 0 || v < arr[i - 1]
  )

  if (slope > 0.3 && last3Up) {
    return {
      state: 'strong', label: '强势市',
      color: 'var(--g)', bThreshold: 4.0, positionRatio: 1.0,
      warning: '大盘趋势向上，正常操作，B≥4.0可建仓',
    }
  }

  if (slope < -0.3 && last3Down) {
    return {
      state: 'weak', label: '弱势市',
      color: 'var(--r)', bThreshold: 4.5, positionRatio: 0.5,
      warning: '⚠ 大盘MA20持续下行，建议减仓至半仓，新信号需B≥4.5',
    }
  }

  return {
    state: 'sideways', label: '震荡市',
    color: 'var(--y)', bThreshold: 4.3, positionRatio: 0.7,
    warning: '大盘震荡，B分阈值上调至4.3，控制新建仓比例≤70%',
  }
}

/**
 * 大盘フィルターを適用したB分の有効判定
 * @param bScore 計算済みB分
 * @param filter calcMarketStateの結果
 */
export function applyMarketFilter(
  bScore: number,
  filter: MarketFilter
): {
  effective:  boolean    // このB分でのエントリーが推奨か
  adjustedB:  number     // フィルター適用後の実効B分（表示用）
  reason:     string
} {
  const effective = bScore >= filter.bThreshold
  // 弱勢市は心理的に-0.3のペナルティ表示
  const adjustedB = filter.state === 'weak'
    ? +Math.max(0, bScore - 0.3).toFixed(2)
    : bScore

  const reason = effective
    ? `B分${bScore}≥阈值${filter.bThreshold}（${filter.label}），可操作`
    : `B分${bScore}<阈值${filter.bThreshold}（${filter.label}），建议观望`

  return { effective, adjustedB, reason }
}

// ══════════════════════════════════════════════
// 融資コスト調整B分（两融账户専用）
// ══════════════════════════════════════════════

/**
 * B分強度から予想保有日数を推定
 * 強いシグナルほど早く利確 or 止損 → 保有期間が短い
 */
function estimateHoldDays(bScore: number): number {
  if (bScore >= 4.5) return 7   // 強力シグナル → 約1週間
  if (bScore >= 4.0) return 14  // 通常シグナル → 約2週間
  if (bScore >= 3.5) return 21  // 弱めシグナル → 約3週間
  return 30                      // 低スコア → 長期化しがち
}

/**
 * 融資コストを考慮した実効B分を計算
 * @param bScore 計算済みB分
 * @param marginRate 融資年利率（华泰証券実際値 5.5%）
 * @param positionRatio 融資比率（仮定30%）
 */
export function calcMarginAdjustedB(
  bScore: number,
  marginRate = 0.055,   // 华泰证券融资利率 5.5%/年（2026/03確認）
  positionRatio = 0.3
): {
  rawB:        number  // 調整前B分
  adjustedB:   number  // 調整後実効B分
  holdDays:    number  // 予想保有日数
  costPct:     number  // 融資コスト（%）
  costPenalty: number  // B分へのペナルティ
} {
  const holdDays    = estimateHoldDays(bScore)
  // 年利5.5% × (保有日数/365) × 融資比率（华泰証券実際値）
  const costPct     = marginRate * (holdDays / 365) * positionRatio * 100
  // B分への換算：+6%で-0.1のペナルティ程度（軽微に設定）
  const costPenalty = +(costPct / 6 * 0.1).toFixed(3)
  const adjustedB   = +Math.max(0, bScore - costPenalty).toFixed(2)

  return {
    rawB: bScore,
    adjustedB,
    holdDays,
    costPct: +costPct.toFixed(3),
    costPenalty,
  }
}
