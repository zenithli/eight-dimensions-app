/**
 * lib/core/time.ts
 *
 * 北京時間（CST = UTC+8）ユーティリティ — 純粋関数
 * 移植自 cstNow / isTradeOpen / cstDateSlash 等
 */

export function cstNow(): Date {
  const now = new Date()
  return new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000)
}

export function cstDateSlash(d: Date = cstNow()): string {
  const y  = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}/${mo}/${da}`
}

export function cstDateYMD(d: Date = cstNow()): string {
  return cstDateSlash(d).replace(/\//g, '')
}

export function cstTimeStr(d: Date = cstNow()): string {
  const h  = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s  = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${mi}:${s}`
}

export function cstHHMM(d: Date = cstNow()): string {
  const h  = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${mi}`
}

/** A株取引時間判定 (09:30–11:30, 13:00–15:00, 平日のみ) */
export function isTradeOpen(d: Date = cstNow()): boolean {
  const day  = d.getDay()
  if (day === 0 || day === 6) return false
  const mins = d.getHours() * 60 + d.getMinutes()
  return (mins >= 9 * 60 + 30 && mins < 11 * 60 + 30) ||
         (mins >= 13 * 60     && mins < 15 * 60)
}
