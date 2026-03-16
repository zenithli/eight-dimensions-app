/**
 * lib/core/ma.ts
 *
 * 移動平均・乖離率計算 — 純粋関数
 * 移植自 fetchMA20Bias() / calcBias200()
 */

// ─────────────────────────────────────────
// MA計算
// ─────────────────────────────────────────
export function calcMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null
    const slice = closes.slice(i - period + 1, i + 1)
    return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(3)
  })
}

// 最後のN本のMA
export function calcLastMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(3)
}

// ─────────────────────────────────────────
// MA20乖離率（シンプル版）
// 東方財富K線から計算 → B分⑧維度の入力に使用
// ─────────────────────────────────────────
export interface MA20BiasResult {
  ma20:  number
  close: number
  bias:  number  // (close - MA20) / MA20 * 100
}

export function calcMA20Bias(closes: number[]): MA20BiasResult | null {
  if (closes.length < 20) return null
  const ma20 = calcLastMA(closes, 20)!
  const close = closes[closes.length - 1]
  const bias = +((close - ma20) / ma20 * 100).toFixed(2)
  return { ma20, close, bias }
}

// ─────────────────────────────────────────
// BIAS200 標準化乖離（高度分析用）
// 移植自 calcBias200()
// ─────────────────────────────────────────
export interface Bias200Result {
  bias200:     number   // (price - MA200) / MA200 * 100
  ma200:       number
  sigma:       number   // 年率換算ボラティリティ
  stdBias:     number   // 標準化乖離 = bias200 / (sigma * 100)
  alertLine:   number   // 80パーセンタイル
  signal:      string
  detail:      string
  sigmaLevel:  number   // 0–4
}

export function calcBias200(
  closes: number[],
  currentPrice: number
): Bias200Result | { signal: string; detail: string } {
  if (closes.length < 200 || isNaN(currentPrice) || currentPrice <= 0) {
    return { signal: '数据不足', detail: '需要至少200日K线数据' }
  }

  // ① MA200
  const ma200arr = closes.slice(-200)
  const ma200val = ma200arr.reduce((a, b) => a + b, 0) / 200
  const bias200 = ((currentPrice - ma200val) / ma200val) * 100

  // ② 年率換算ボラティリティ
  const returns: number[] = []
  for (let i = 1; i < ma200arr.length; i++) {
    if (ma200arr[i - 1] > 0) {
      returns.push((ma200arr[i] - ma200arr[i - 1]) / ma200arr[i - 1])
    }
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
  const sigma = Math.sqrt(variance) * Math.sqrt(250) * 100

  // ③ 標準化乖離
  const stdBias = sigma > 0 ? bias200 / sigma : 0

  // ④ 動的警戒線（80パーセンタイル）
  const allBias200: number[] = []
  for (let i = 199; i < closes.length; i++) {
    const slice = closes.slice(i - 199, i + 1)
    const ma = slice.reduce((a, b) => a + b, 0) / 200
    allBias200.push(((closes[i] - ma) / ma) * 100)
  }
  allBias200.sort((a, b) => a - b)
  const p80Idx = Math.floor(allBias200.length * 0.8)
  const alertLine = allBias200[p80Idx] ?? bias200 * 0.8

  // ⑤ シグナル判定
  const abs = Math.abs(stdBias)
  let signal = '⬜ 正常区间'
  let sigmaLevel = 0
  if (abs >= 2.5)      { signal = '🔴 极端乖离'; sigmaLevel = 4 }
  else if (abs >= 2.0) { signal = '🟠 乖离过大'; sigmaLevel = 3 }
  else if (abs >= 1.5) { signal = '🟡 偏高';     sigmaLevel = 2 }
  else if (stdBias <= -1.5) { signal = '🟢 超跌区间'; sigmaLevel = 1 }

  const detail = `MA200=${ma200val.toFixed(2)} σ=${sigma.toFixed(1)}% BIAS200=${bias200.toFixed(1)}% 标准化=${stdBias.toFixed(2)}`

  return {
    bias200:    +bias200.toFixed(2),
    ma200:      +ma200val.toFixed(3),
    sigma:      +sigma.toFixed(2),
    stdBias:    +stdBias.toFixed(3),
    alertLine:  +alertLine.toFixed(2),
    signal,
    detail,
    sigmaLevel,
  }
}
