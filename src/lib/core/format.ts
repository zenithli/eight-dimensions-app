/**
 * lib/core/format.ts
 *
 * 表示フォーマット — 純粋関数
 * 移植自 pctFmt / fmtVol / fmtAmt / bSigLabel
 */

export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(digits)}%`
}

export function fmtPrice(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || v === 0) return '—'
  return v.toFixed(digits)
}

export function fmtVol(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}亿`
  if (v >= 10_000)      return `${(v / 10_000).toFixed(0)}万`
  return String(v)
}

export function fmtAmt(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(2)}亿`
  if (v >= 10_000)      return `${(v / 10_000).toFixed(0)}万`
  return String(v)
}

export function fmtStopLoss(price: number, cost: number): string {
  const base = cost > 0 ? cost : price
  if (!base) return '—'
  return (base * 0.92).toFixed(2)
}

export function fmtTarget(price: number, cost: number): string {
  const base = cost > 0 ? cost : price
  if (!base) return '—'
  return (base * 1.15).toFixed(2)
}

// 涨跌の色クラス（Tailwind）
export function pctColorClass(v: number): string {
  if (v > 0) return 'text-red-500'   // A株慣習：上昇=赤
  if (v < 0) return 'text-green-500' // 下落=緑
  return 'text-slate-400'
}

// CST 日時フォーマット
export function fmtCstDate(d: Date): string {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000
  const cst = new Date(utc + 8 * 3600000)
  const y   = cst.getFullYear()
  const mo  = String(cst.getMonth() + 1).padStart(2, '0')
  const da  = String(cst.getDate()).padStart(2, '0')
  const h   = String(cst.getHours()).padStart(2, '0')
  const mi  = String(cst.getMinutes()).padStart(2, '0')
  return `${y}/${mo}/${da} ${h}:${mi}`
}

export function fmtCstTime(d: Date = new Date()): string {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000
  const cst = new Date(utc + 8 * 3600000)
  const h  = String(cst.getHours()).padStart(2, '0')
  const mi = String(cst.getMinutes()).padStart(2, '0')
  const s  = String(cst.getSeconds()).padStart(2, '0')
  return `${h}:${mi}:${s} (北京)`
}
