'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface TrendPanelProps {
  code: string
  stopLoss: number
  targetPrice: number
}

interface KlineBar {
  date: string
  close: number
  high: number
  low: number
  vol: number
  chg: number
}

export function TrendPanel({ code, stopLoss, targetPrice }: TrendPanelProps) {
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded]   = useState(false)
  const [errMsg, setErrMsg]   = useState('')
  const [data, setData]       = useState<KlineBar[]>([])

  const trendRef  = useRef<HTMLCanvasElement>(null)
  const priceRef  = useRef<HTMLCanvasElement>(null)
  const bscoreRef = useRef<HTMLCanvasElement>(null)
  const biasRef   = useRef<HTMLCanvasElement>(null)
  const rrRef     = useRef<HTMLCanvasElement>(null)

  const draw = useCallback((bars: KlineBar[]) => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light'
    const bg   = dark ? '#0c1422' : '#f0f3f8'
    const line = dark ? '#38c8ff' : '#0055cc'
    const grid = dark ? 'rgba(56,200,255,0.08)' : 'rgba(0,80,180,0.08)'
    const txt  = dark ? '#7a9dbb' : '#3a5a7a'

    function setup(ref: React.RefObject<HTMLCanvasElement>, h: number) {
      const cv = ref.current; if (!cv) return null
      const dpr = window.devicePixelRatio || 1
      const W   = cv.parentElement?.clientWidth || 600
      cv.width  = W * dpr; cv.height = h * dpr
      cv.style.width = W + 'px'; cv.style.height = h + 'px'
      const ctx = cv.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, h)
      return { ctx, W, H: h }
    }

    const n = bars.length
    if (n < 2) return

    // 価格チャート
    const ps = setup(priceRef, 140)
    if (ps) {
      const { ctx, W, H } = ps
      const PAD = { t:14, r:18, b:28, l:62 }
      const gw = W - PAD.l - PAD.r, gh = H - PAD.t - PAD.b
      const prices = bars.map(d => d.close)
      const mn = Math.min(...prices, stopLoss, targetPrice) * 0.99
      const mx = Math.max(...prices, stopLoss, targetPrice) * 1.01
      const xS = (i: number) => PAD.l + i * (gw / (n - 1))
      const yS = (v: number) => PAD.t + gh - (v - mn) / (mx - mn) * gh
      // グリッド
      ctx.strokeStyle = grid; ctx.lineWidth = 0.5
      for (let v = Math.ceil(mn); v <= mx; v += Math.round((mx-mn)/4)||1) {
        const y = yS(v)
        ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W-PAD.r, y); ctx.stroke()
        ctx.fillStyle = txt; ctx.font = '9px IBM Plex Mono'
        ctx.fillText('¥'+v.toFixed(1), 2, y+3)
      }
      // 止損線
      ctx.strokeStyle = '#ff3a6e'; ctx.lineWidth = 1; ctx.setLineDash([4,3])
      ctx.beginPath(); ctx.moveTo(PAD.l, yS(stopLoss)); ctx.lineTo(W-PAD.r, yS(stopLoss)); ctx.stroke()
      // 目標線
      ctx.strokeStyle = '#00e87a'
      ctx.beginPath(); ctx.moveTo(PAD.l, yS(targetPrice)); ctx.lineTo(W-PAD.r, yS(targetPrice)); ctx.stroke()
      ctx.setLineDash([])
      // 価格折れ線
      ctx.strokeStyle = line; ctx.lineWidth = 1.5
      ctx.beginPath()
      prices.forEach((p, i) => i === 0 ? ctx.moveTo(xS(i), yS(p)) : ctx.lineTo(xS(i), yS(p)))
      ctx.stroke()
      // 日付
      ctx.fillStyle = txt; ctx.font = '8px IBM Plex Mono'
      ctx.fillText(bars[0].date.slice(5), PAD.l, H-4)
      ctx.fillText(bars[n-1].date.slice(5), xS(n-1)-22, H-4)
    }

    // MA20乖離チャート（biasChart）
    const bs = setup(biasRef, 80)
    if (bs) {
      const { ctx, W, H } = bs
      const PAD = { t:10, r:18, b:22, l:52 }
      const gw = W - PAD.l - PAD.r, gh = H - PAD.t - PAD.b
      // MA20を計算
      const ma20s = bars.map((_, i) => {
        if (i < 19) return null
        const slice = bars.slice(i-19, i+1)
        return slice.reduce((s, b) => s + b.close, 0) / 20
      })
      const biases = bars.map((b, i) => {
        const ma = ma20s[i]
        return ma ? (b.close - ma) / ma * 100 : null
      }).filter(v => v !== null) as number[]
      if (biases.length < 2) { return }
      const mn = Math.min(-5, Math.min(...biases) - 2)
      const mx = Math.max(40, Math.max(...biases) + 2)
      const offset = bars.length - biases.length
      const xS = (i: number) => PAD.l + (i + offset) * (gw / (n - 1))
      const yS = (v: number) => PAD.t + gh - (v - mn) / (mx - mn) * gh
      // ゼロライン
      ctx.strokeStyle = grid; ctx.lineWidth = 0.5
      const y0 = yS(0)
      ctx.beginPath(); ctx.moveTo(PAD.l, y0); ctx.lineTo(W-PAD.r, y0); ctx.stroke()
      // 超過ライン30%
      ctx.strokeStyle = 'rgba(255,58,110,0.3)'; ctx.setLineDash([4,3])
      const y30 = yS(30)
      ctx.beginPath(); ctx.moveTo(PAD.l, y30); ctx.lineTo(W-PAD.r, y30); ctx.stroke()
      ctx.setLineDash([])
      // 折れ線
      ctx.strokeStyle = '#f7c948'; ctx.lineWidth = 1.5
      ctx.beginPath()
      biases.forEach((v, i) => i === 0 ? ctx.moveTo(xS(i), yS(v)) : ctx.lineTo(xS(i), yS(v)))
      ctx.stroke()
      ctx.fillStyle = txt; ctx.font = '8px IBM Plex Mono'
      ctx.fillText('bias%', 2, PAD.t + gh/2)
    }

    // RRチャート
    const rs = setup(rrRef, 70)
    if (rs) {
      const { ctx, W, H } = rs
      const PAD = { t:10, r:18, b:20, l:52 }
      const gw = W - PAD.l - PAD.r, gh = H - PAD.t - PAD.b
      const xS = (i: number) => PAD.l + i * (gw / (n - 1))
      const yS = (v: number) => PAD.t + gh - Math.min(v, 5) / 5 * gh
      // RR = (price - stopLoss) / (targetPrice - price)
      const rrs = bars.map(b => {
        const reward = targetPrice - b.close
        const risk   = b.close - stopLoss
        return risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0
      })
      // 背景
      ctx.fillStyle = 'rgba(0,232,122,0.06)'
      ctx.fillRect(PAD.l, yS(5), gw, yS(2) - yS(5))
      // 基準線2.0
      ctx.strokeStyle = 'rgba(0,232,122,0.4)'; ctx.lineWidth = 0.5; ctx.setLineDash([3,3])
      ctx.beginPath(); ctx.moveTo(PAD.l, yS(2)); ctx.lineTo(W-PAD.r, yS(2)); ctx.stroke()
      ctx.setLineDash([])
      // 折れ線
      ctx.strokeStyle = '#00e87a'; ctx.lineWidth = 1.5
      ctx.beginPath()
      rrs.forEach((v, i) => i === 0 ? ctx.moveTo(xS(i), yS(v)) : ctx.lineTo(xS(i), yS(v)))
      ctx.stroke()
      ctx.fillStyle = txt; ctx.font = '8px IBM Plex Mono'
      ctx.fillText('RR', 2, PAD.t + gh/2)
    }

  }, [stopLoss, targetPrice])

  useEffect(() => {
    if (loaded && data.length > 0) {
      setTimeout(() => draw(data), 50)
    }
  }, [loaded, data, draw])

  async function handleLoad() {
    setLoading(true); setErrMsg('')
    try {
      const mid = /^(60|68|51|58)/.test(code) ? '1' : '0'
      const url = 'https://push2his.eastmoney.com/api/qt/stock/kline/get' +
        '?fields1=f1,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61' +
        '&klt=101&fqt=0&beg=19900101&end=20500101&lmt=160' +
        '&secid=' + mid + '.' + code +
        '&ut=b2884a393a59ad64002292a3e90d46a5&_=' + Date.now()
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const json = await r.json()
      const klines: string[] = json?.data?.klines
      if (!klines?.length) throw new Error('暂无K线数据')
      const bars: KlineBar[] = klines.map((line: string) => {
        const parts = line.split(',')
        return {
          date:  parts[0],
          close: parseFloat(parts[2]),
          high:  parseFloat(parts[3]),
          low:   parseFloat(parts[4]),
          vol:   parseFloat(parts[5]),
          chg:   parseFloat(parts[9]),
        }
      })
      setData(bars)
      setLoaded(true)
    } catch(e: unknown) {
      setErrMsg(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const S = {
    card: { backgroundColor: 'var(--bg2)', border: '1px solid var(--bd)',
            borderRadius: 12, marginTop: 8, overflow: 'hidden' as const },
    hdr:  { padding: '10px 16px', borderBottom: '1px solid var(--bd)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    lbl:  { fontFamily: 'IBM Plex Mono', fontSize: 8, color: 'var(--t3)',
            letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 },
    btn:  { fontFamily: 'IBM Plex Mono', fontSize: 10, padding: '4px 12px',
            border: '1px solid rgba(56,200,255,0.3)', borderRadius: 4,
            cursor: 'pointer' as const, color: 'var(--c)', backgroundColor: 'transparent' },
  }

  return (
    <div style={S.card}>
      <div style={S.hdr}>
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.12em' }}>
          📈 90天价格走势 · 止损/目标追踪
        </span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {errMsg && <span style={{ fontSize:10, color:'var(--r)' }}>{errMsg}</span>}
          <button onClick={handleLoad} disabled={loading} style={S.btn}>
            {loading ? '⟳ 加载中…' : loaded ? '↻ 刷新' : '📈 载入走势图'}
          </button>
        </div>
      </div>

      {loaded && (
        <div style={{ padding:'12px 16px' }}>
          <div style={{ marginBottom:10 }}>
            <div style={S.lbl}>PRICE · 价格走势 · <span style={{color:'var(--r)'}}>── 止损</span> · <span style={{color:'var(--g)'}}>── 目标</span></div>
            <div style={{ width:'100%', height:140 }}><canvas ref={priceRef} style={{ width:'100%', height:'100%' }} /></div>
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={S.lbl}>MA20乖离率</div>
            <div style={{ width:'100%', height:80 }}><canvas ref={biasRef} style={{ width:'100%', height:'100%' }} /></div>
          </div>
          <div style={{ marginBottom:4 }}>
            <div style={S.lbl}>RR比 · 盈亏比推移</div>
            <div style={{ width:'100%', height:70 }}><canvas ref={rrRef} style={{ width:'100%', height:'100%' }} /></div>
          </div>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:8, color:'var(--t3)', marginTop:6 }}>
            共 {data.length} 根K线 · 止损¥{stopLoss.toFixed(2)} · 目标¥{targetPrice.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}
