/**
 * lib/eastmoney.ts
 *
 * 東方財富 API クライアント — サーバーサイド専用
 * 移植自 fetchRealtime() / fetchKline() in eight-dimensions-v6.html
 *
 * ⚠️ このファイルは Next.js Route Handler から呼び出すこと
 *    フロントから直接呼ばないこと（CORSブロックされる）
 */

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://finance.eastmoney.com/',
}

// secid: 沪市(5/6开头) → 1.xxx, 深市 → 0.xxx
function getSecid(code: string): string {
  return code.startsWith('6') || code.startsWith('5') ? `1.${code}` : `0.${code}`
}

// ─────────────────────────────────────────
// リアルタイム行情
// ─────────────────────────────────────────
export interface RealtimeQuote {
  code:      string
  name:      string
  price:     number
  changePct: number
  change:    number
  rise3d:    number
  rise6d:    number
  rise1m:    number
  riseMon:   number
  volRatio:  number
  volume:    number
  amount:    number
  high:      number
  low:       number
  open:      number
  prevClose: number
  pe:        number
  pb:        number
}

export async function fetchRealtimeQuote(code: string): Promise<RealtimeQuote> {
  const secid = getSecid(code)
  const fields = 'f43,f44,f45,f46,f47,f48,f50,f57,f58,f60,f116,f117,f127,f128,f129,f130'
  const url =
    `https://push2.eastmoney.com/api/qt/stock/get?fltt=1&invt=2&fields=${fields}` +
    `&secid=${secid}&ut=b2884a393a59ad64002292a3e90d46a5`

  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 30 } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  const d = json?.data
  if (!d || d.f43 === undefined) throw new Error(`无效代码或无数据: ${code}`)

  const price     = d.f43 / 100
  const prevClose = d.f60 / 100
  const change    = +(price - prevClose).toFixed(3)
  const changePct = prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0

  return {
    code,
    name:      d.f58   ?? code,
    price,
    changePct,
    change,
    rise3d:    d.f127  !== undefined ? +(d.f127  / 100).toFixed(2) : 0,
    rise6d:    d.f128  !== undefined ? +(d.f128  / 100).toFixed(2) : 0,
    rise1m:    d.f129  !== undefined ? +(d.f129  / 100).toFixed(2) : 0,
    riseMon:   d.f130  !== undefined ? +(d.f130  / 100).toFixed(2) : 0,
    volRatio:  d.f50   !== undefined ? +(d.f50   / 100).toFixed(2) : 1,
    volume:    d.f47   ?? 0,
    amount:    d.f48   ?? 0,
    high:      d.f44   ? +(d.f44 / 100).toFixed(3) : 0,
    low:       d.f45   ? +(d.f45 / 100).toFixed(3) : 0,
    open:      d.f46   ? +(d.f46 / 100).toFixed(3) : 0,
    prevClose,
    pe:        d.f116  !== undefined ? +(d.f116  / 100).toFixed(2) : 0,
    pb:        d.f117  !== undefined ? +(d.f117  / 100).toFixed(2) : 0,
  }
}

// ─────────────────────────────────────────
// 日足K線（最大280本）
// ─────────────────────────────────────────
export interface KlineBar {
  date:      string
  open:      number
  close:     number
  high:      number
  low:       number
  volume:    number
  changePct: number
  ma5?:      number | null
  ma10?:     number | null
  ma20?:     number | null
  ma60?:     number | null
}

export async function fetchKlineDaily(code: string, limit = 90): Promise<KlineBar[]> {
  const secid = getSecid(code)
  const url =
    `https://push2his.eastmoney.com/api/qt/stock/kline/get` +
    `?fields1=f1,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61` +
    `&klt=101&fqt=0&beg=19900101&end=20500101&lmt=${limit}` +
    `&secid=${secid}&ut=b2884a393a59ad64002292a3e90d46a5`

  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`K線API HTTP ${res.status}`)

  const json  = await res.json()
  const lines = (json?.data?.klines ?? []) as string[]
  if (lines.length === 0) throw new Error(`K線データなし: ${code}`)

  const bars: KlineBar[] = lines.map(line => {
    const parts = line.split(',')
    return {
      date:      parts[0],
      open:      parseFloat(parts[1]),
      close:     parseFloat(parts[2]),
      high:      parseFloat(parts[3]),
      low:       parseFloat(parts[4]),
      volume:    parseFloat(parts[5]),
      changePct: parseFloat(parts[8]),
    }
  })

  return addMA(bars)
}

function addMA(bars: KlineBar[]): KlineBar[] {
  const closes = bars.map(b => b.close)
  return bars.map((bar, i) => ({
    ...bar,
    ma5:  i >= 4  ? ma(closes, i, 5)  : null,
    ma10: i >= 9  ? ma(closes, i, 10) : null,
    ma20: i >= 19 ? ma(closes, i, 20) : null,
    ma60: i >= 59 ? ma(closes, i, 60) : null,
  }))
}

function ma(arr: number[], end: number, period: number): number {
  const s = arr.slice(end - period + 1, end + 1)
  return +(s.reduce((a, b) => a + b, 0) / period).toFixed(3)
}

// ─────────────────────────────────────────
// MA20乖離率（B分⑧次元の入力）
// ─────────────────────────────────────────
export async function fetchMA20Bias(
  code: string
): Promise<{ ma20: number; close: number; bias: number }> {
  const bars = await fetchKlineDaily(code, 90)
  if (bars.length < 20) throw new Error('K線不足20根')

  const closes  = bars.map(b => b.close)
  const last20  = closes.slice(-20)
  const ma20    = last20.reduce((a, b) => a + b, 0) / 20
  const latest  = closes[closes.length - 1]
  const bias    = +((latest - ma20) / ma20 * 100).toFixed(2)

  return { ma20: +ma20.toFixed(3), close: latest, bias }
}
