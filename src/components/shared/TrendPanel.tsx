'use client'
/**
 * TrendPanel_v6.tsx  202603170224
 * V6の走勢図を完全移植:
 *  1. legend説明バー（①②③④⑧B分盈亏比）
 *  2. 主図: ①趋势共振 ②量价 ③RS 综合 (280px) ← V6のrenderTrendCanvas
 *  3. ⑧乖離率図 (120px) ← V6のrenderBiasChart
 *  4. B分走势図 (100px) ← V6のrenderBScoreChart
 *  5. 盈亏比RR図 (110px) ← V6のrenderRRChart
 *  6. 価格+止損+目標図 (200px) ← V6のrenderPriceCanvas（分段着色）
 *  7. 统计摘要（8格サマリー）
 *  8. 全図にhover tooltip
 *  9. テーマ切り替え対応
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'

interface KBar {
  date: string; open: number; close: number
  high: number; low: number; volume: number; changePct: number
}

interface TrendResult {
  date: string; label: string
  close: number; changePct: number
  open: number; high: number; low: number
  trend: number; vp: number; rs: number; comp: number
  bias20: number; rise20: number; bScore: number
  ma5: number; ma20: number; ma60: number
  trendSm: number; vpSm: number; rsSm: number
  compSmooth: number; bias20Sm: number; bScoreSm: number
  stop: number; target: number; rr: number
  stopAdj: number; rrAdj: number; stopPct: number
}

interface TrendPanelProps {
  code: string
  stopLoss: number
  targetPrice: number
}

export function TrendPanel({ code, stopLoss, targetPrice }: TrendPanelProps) {
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)
  const [errMsg,  setErrMsg]  = useState('')
  const [results, setResults] = useState<TrendResult[]>([])

  const trendRef = useRef<HTMLCanvasElement>(null)
  const biasRef  = useRef<HTMLCanvasElement>(null)
  const bsRef    = useRef<HTMLCanvasElement>(null)
  const rrRef    = useRef<HTMLCanvasElement>(null)
  const priceRef = useRef<HTMLCanvasElement>(null)

  // ── ダークモード判定 ──
  function isDark(): boolean {
    return document.documentElement.getAttribute('data-theme') !== 'light'
  }

  // ── canvasSetup ──
  function csup(ref: React.RefObject<HTMLCanvasElement>, H: number) {
    const cv = ref.current; if (!cv) return null
    const dpr = window.devicePixelRatio || 1
    const W   = cv.parentElement?.clientWidth || 800
    cv.width  = W * dpr; cv.height = H * dpr
    cv.style.width = W + 'px'; cv.style.height = H + 'px'
    const ctx = cv.getContext('2d')!
    ctx.scale(dpr, dpr)
    return { cv, ctx, W, H }
  }

  // ── 滑動平均 ──
  function rollingAvg(arr: number[], w: number): number[] {
    return arr.map((_, i) => {
      const sl = arr.slice(Math.max(0, i - w + 1), i + 1)
      return +(sl.reduce((a, b) => a + b, 0) / sl.length).toFixed(2)
    })
  }

  // ── K線データから結果計算 ── V6コード完全移植版
  const calcResults = useCallback((bars: KBar[]): TrendResult[] => {
    // V6と同一: stockK全体 + 最後の90本をklines対象にする
    const stockK = bars
    const klines = stockK.slice(-90)
    const allCloses = stockK.map(k => k.close)
    const allVols   = stockK.map(k => k.volume)
    const n = stockK.length

    const results: TrendResult[] = []

    klines.forEach((k, idx) => {
      const ai = n - klines.length + idx
      // V6と同一のMA計算
      const ma = (p: number) => {
        if (ai < p - 1) return null
        const sl = allCloses.slice(ai - p + 1, ai + 1)
        return sl.reduce((a, b) => a + b, 0) / p
      }
      const ma5 = ma(5), ma20 = ma(20), ma60 = ma(60)

      // ① 趋势強度 ── V6完全一致（4項目、0〜4点→1〜5スコア）
      let trend = 1
      if (ma5 && ma20 && ma60) {
        let sc = 0
        if (ma5 > ma20)    sc++
        if (ma20 > ma60)   sc++
        if (k.close > ma5) sc++
        if (k.close > ma20) sc++
        trend = sc === 0 ? 1 : sc === 1 ? 2 : sc === 2 ? 3 : sc === 3 ? 4 : 5
      }

      // ② 量価健康度 ── V6完全一致（直近5本の動的avgVol）
      let vp = 3
      if (ai > 0) {
        const pc = allCloses[ai - 1]
        const up = k.close > pc
        const baseVols = allVols.slice(Math.max(0, ai - 5), ai)
        const avgVol = baseVols.length
          ? baseVols.reduce((a, b) => a + b, 0) / baseVols.length
          : allVols[ai - 1]
        const big = k.volume > avgVol * 1.15, sml = k.volume < avgVol * 0.85
        if (up && big) vp = 5
        else if (!up && sml) vp = 4
        else if (up && sml) vp = 3
        else if (!up && big) vp = 1
        else vp = 3
      }

      // ③ 相対強弱RS ── V6完全一致（個別changePctのみ、沪指なし版）
      let rs = 3
      rs = k.changePct > 1.5 ? 5 : k.changePct > 0.3 ? 4 : k.changePct > -0.3 ? 3 : k.changePct > -1.5 ? 2 : 1

      const comp = +((trend + vp + rs) / 3).toFixed(2)

      // ⑧ 乖離率
      let bias20 = 0
      if (ma20 && ma20 > 0) bias20 = +((k.close - ma20) / ma20 * 100).toFixed(2)

      // 近20日涨幅
      let rise20 = 0
      if (ai >= 20 && allCloses[ai - 20] > 0)
        rise20 = +((k.close - allCloses[ai - 20]) / allCloses[ai - 20] * 100).toFixed(2)

      // B分（V6完全一致）
      let rawB = (trend * 2 + vp + rs) / 4
      if (rise20 > 35)            rawB = 0
      else if (rise20 > 30)       rawB -= 0.28
      else if (rise20 > 25)       rawB -= 0.18
      else if (rise20 > 20)       rawB -= 0.08
      else if (rise20 <= 10 && rise20 > 0) rawB += 0.05
      const bScore = +Math.max(0, Math.min(5.5, rawB)).toFixed(2)

      results.push({
        date: k.date, label: k.date.slice(5),
        close: k.close, changePct: k.changePct,
        open: k.open, high: k.high, low: k.low,
        trend, vp, rs, comp, bias20, rise20, bScore,
        ma5: ma5 || 0, ma20: ma20 || 0, ma60: ma60 || 0,
        trendSm:0, vpSm:0, rsSm:0, compSmooth:0, bias20Sm:0, bScoreSm:0,
        stop:0, target:0, rr:0, stopAdj:0, rrAdj:0, stopPct:0,
      })
    })

    // 平滑化（V6完全一致）
    const tSm  = rollingAvg(results.map(r => r.trend),  5)
    const vSm  = rollingAvg(results.map(r => r.vp),     5)
    const rSm  = rollingAvg(results.map(r => r.rs),    10)
    const cSm  = rollingAvg(results.map(r => r.comp),   5)
    const bSm  = rollingAvg(results.map(r => r.bias20), 5)
    const bsSm = rollingAvg(results.map(r => r.bScore), 3)

    // ── 逐日止損・目標・RR計算（V6完全一致）──
    results.forEach((r, i) => {
      const c = r.close
      const lo10 = Math.min(...results.slice(Math.max(0,i-9), i+1).map(x => x.low || x.close))
      const stopSupport = lo10 * 0.99
      const stopPct2    = c * 0.92
      const stop   = Math.max(stopSupport, stopPct2)
      const hi30   = Math.max(...results.slice(Math.max(0,i-29), i+1).map(x => x.high || x.close))
      const target = Math.max(hi30 * 1.03, c * 1.15)
      const risk   = Math.abs(c - stop)
      const reward = Math.abs(target - c)
      const rr     = risk > 0 ? +(reward / risk).toFixed(2) : 0
      let stopAdj  = stop
      if (r.rise20 > 35)      stopAdj = c * 0.95
      else if (r.rise20 > 25) stopAdj = c * 0.94
      const riskAdj = Math.abs(c - stopAdj)
      const rrAdj   = riskAdj > 0 ? +(reward / riskAdj).toFixed(2) : 0
      r.stop   = +stop.toFixed(3);    r.target  = +target.toFixed(3)
      r.rr     = rr;                  r.stopAdj = +stopAdj.toFixed(3)
      r.rrAdj  = rrAdj;               r.stopPct = +((c - stop) / c * 100).toFixed(2)
    })

    // 平滑値を代入（V6の results.forEach と同一順序）
    results.forEach((r, i) => {
      r.trendSm    = tSm[i]
      r.vpSm       = vSm[i]
      r.rsSm       = rSm[i]
      r.compSmooth = cSm[i]  // ← V7で抜けていたフィールド
      r.bias20Sm   = bSm[i]
      r.bScoreSm   = bsSm[i]
    })

    return results
  }, [])

  // ══ 描画関数群（V6の関数を1:1移植）══

  // ① renderTrendCanvas 280px
  const drawTrend = useCallback((data: TrendResult[]) => {
    const s = csup(trendRef, 280); if (!s) return
    const { cv, ctx, W, H } = s
    const dark = isDark()
    const PAD = { t:14, r:18, b:32, l:52 }
    const gw = W-PAD.l-PAD.r, gh = H-PAD.t-PAD.b
    const n = data.length
    ctx.fillStyle = dark ? '#04070f' : '#f0f4f8'; ctx.fillRect(0,0,W,H)
    const yS = (v: number) => PAD.t + gh - (Math.max(1, Math.min(5,v)) - 1) / 4 * gh
    const xS = (i: number) => PAD.l + i * (gw / (n-1))
    // グリッド
    ;[1,2,3,4,5].forEach(v => {
      const y = yS(v)
      ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(PAD.l+gw,y)
      ctx.strokeStyle = dark ? 'rgba(0,207,255,0.07)' : 'rgba(0,100,180,0.1)'; ctx.lineWidth=1; ctx.stroke()
      ctx.fillStyle = dark ? '#6a8faa' : '#4a6a8a'; ctx.font = '9px "IBM Plex Mono",monospace'
      ctx.textAlign = 'right'; ctx.fillText(['','弱','偏弱','中','偏强','强'][v], PAD.l-4, y+3.5)
    })
    // 基準線3（紫破線）
    ctx.beginPath(); ctx.setLineDash([4,4])
    ctx.moveTo(PAD.l, yS(3)); ctx.lineTo(PAD.l+gw, yS(3))
    ctx.strokeStyle = dark ? 'rgba(167,139,250,0.35)' : 'rgba(130,100,200,0.45)'; ctx.lineWidth=1.2; ctx.stroke(); ctx.setLineDash([])
    // X標籤
    ctx.fillStyle = dark ? '#6a8faa' : '#4a6a8a'; ctx.font='9px "IBM Plex Mono",monospace'; ctx.textAlign='center'
    data.forEach((d,i) => { if(i%15===0 || i===n-1) ctx.fillText(d.label, xS(i), H-PAD.b+14) })
    // 面積塗り（综合）
    ctx.beginPath()
    data.forEach((d,i) => { const x=xS(i),y=yS(d.compSmooth||d.comp); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.lineTo(xS(n-1), yS(1)); ctx.lineTo(PAD.l, yS(1)); ctx.closePath()
    ctx.fillStyle = dark ? 'rgba(167,139,250,0.09)' : 'rgba(130,100,200,0.1)'; ctx.fill()
    // 4本線
    const dl = (vals: number[], col: string, lw: number, dash?: number[]) => {
      ctx.beginPath(); ctx.setLineDash(dash||[])
      vals.forEach((v,i) => { const x=xS(i),y=yS(v); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
      ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.stroke(); ctx.setLineDash([])
    }
    dl(data.map(d => d.trendSm||d.trend),    '#00cfff', 1.8)
    dl(data.map(d => d.vpSm||d.vp),          '#ffd23f', 1.8)
    dl(data.map(d => d.rsSm||d.rs),          '#00e87a', 1.8)
    dl(data.map(d => d.compSmooth||d.comp),  '#a78bfa', 2.8, [5,3])
    // 末点
    ;[{v:data[n-1].trendSm,c:'#00cfff'},{v:data[n-1].vpSm,c:'#ffd23f'},{v:data[n-1].rsSm,c:'#00e87a'},{v:data[n-1].compSmooth,c:'#a78bfa'}]
      .forEach(({v,c}) => { ctx.beginPath(); ctx.arc(xS(n-1),yS(v||0),3.5,0,Math.PI*2); ctx.fillStyle=c; ctx.fill() })
    // hover
    cv.onmousemove = (e: MouseEvent) => {
      const rect = cv.getBoundingClientRect()
      const idx = Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1))
      if(idx<0||idx>=n) return
      drawTrend(data)
      const ctx2 = cv.getContext('2d')!
      const d = data[idx], x = xS(idx)
      ctx2.save()
      ctx2.beginPath(); ctx2.moveTo(x,PAD.t); ctx2.lineTo(x,PAD.t+gh)
      ctx2.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'; ctx2.lineWidth=1; ctx2.stroke()
      const lv = (v: number) => ['','弱','偏弱','中','偏强','强'][Math.round(Math.min(5,Math.max(1,v)))]||'?'
      const lines = [
        d.date,
        '①趋势: '+lv(d.trendSm||d.trend)+' ('+((d.trendSm||d.trend)).toFixed(1)+')',
        '②量价: '+lv(d.vpSm||d.vp)+' ('+((d.vpSm||d.vp)).toFixed(1)+')',
        '③RS:   '+lv(d.rsSm||d.rs)+' ('+((d.rsSm||d.rs)).toFixed(1)+')',
        '综合:  '+((d.compSmooth||d.comp)).toFixed(2),
        (d.changePct>=0?'▲+':'▼')+d.changePct.toFixed(2)+'%',
      ]
      const bw=162, bh=lines.length*16+18
      const bx = x+10<W-bw-PAD.r ? x+10 : x-bw-10, by=PAD.t+4
      ctx2.fillStyle = dark ? 'rgba(7,12,24,0.93)' : 'rgba(240,244,248,0.96)'
      ctx2.strokeStyle = dark ? 'rgba(0,207,255,0.4)' : 'rgba(0,100,180,0.3)'; ctx2.lineWidth=1
      ctx2.fillRect(bx,by,bw,bh); ctx2.strokeRect(bx,by,bw,bh)
      ;['#cce4f8','#00cfff','#ffd23f','#00e87a','#a78bfa','#888899'].forEach((cl,i) => {
        ctx2.fillStyle=cl; ctx2.font='10px "IBM Plex Mono",monospace'; ctx2.textAlign='left'
        ctx2.fillText(lines[i], bx+8, by+14+i*16)
      })
      ctx2.restore()
    }
    cv.onmouseleave = () => drawTrend(data)
  }, [])

  // ② renderBiasChart 120px
  const drawBias = useCallback((data: TrendResult[]) => {
    const s = csup(biasRef, 120); if (!s) return
    const { cv, ctx, W, H } = s
    const dark = isDark()
    const PAD = { t:12, r:18, b:24, l:52 }
    const gw = W-PAD.l-PAD.r, gh = H-PAD.t-PAD.b
    const n = data.length
    ctx.fillStyle = dark ? '#04070f' : '#f0f4f8'; ctx.fillRect(0,0,W,H)
    const vals = data.map(d => d.bias20Sm||d.bias20||0)
    const mn = Math.min(-5, Math.min(...vals)-2)
    const mx = Math.max(40, Math.max(...vals)+2)
    const yS = (v: number) => PAD.t + gh - (v-mn)/(mx-mn)*gh
    const xS = (i: number) => PAD.l + i*(gw/(n-1))
    // 危険区域背景
    const y20=yS(20), y10=yS(10), y35=yS(35)
    ctx.fillStyle = dark ? 'rgba(255,45,85,0.08)' : 'rgba(255,45,85,0.06)'
    ctx.fillRect(PAD.l, Math.min(y35,PAD.t), gw, Math.max(0,yS(20)-Math.min(y35,PAD.t)))
    ctx.fillStyle = dark ? 'rgba(255,210,63,0.07)' : 'rgba(255,210,63,0.06)'
    ctx.fillRect(PAD.l, y20, gw, Math.max(0,y10-y20))
    ctx.fillStyle = dark ? 'rgba(0,232,122,0.06)' : 'rgba(0,232,122,0.05)'
    ctx.fillRect(PAD.l, y10, gw, Math.max(0,yS(0)-y10))
    // グリッド線
    ;([[0,'⬜0%','#5a7a9a'],[10,'⚡10%','#ffd23f'],[20,'⚠20%','#ff8c35'],[35,'⛔35%','#ff2d55']] as Array<[number,string,string]>).forEach(([v,lbl,col]) => {
      const y = yS(v)
      if(y<PAD.t||y>PAD.t+gh) return
      ctx.beginPath(); ctx.setLineDash([4,4]); ctx.moveTo(PAD.l,y); ctx.lineTo(PAD.l+gw,y)
      ctx.strokeStyle=col+'55'; ctx.lineWidth=1; ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle=col; ctx.font='8px "IBM Plex Mono",monospace'; ctx.textAlign='right'
      ctx.fillText(lbl, PAD.l-3, y+3)
    })
    // X
    ctx.fillStyle = dark?'#6a8faa':'#4a6a8a'; ctx.font='8px "IBM Plex Mono",monospace'; ctx.textAlign='center'
    data.forEach((d,i) => { if(i%15===0||i===n-1) ctx.fillText(d.label, xS(i), H-PAD.b+12) })
    // 面積
    data.forEach((d,i) => {
      if(i===0) return
      const v=d.bias20Sm||0, pv=(data[i-1].bias20Sm||0)
      const x1=xS(i-1), x2=xS(i), y1=yS(Math.max(0,pv)), y2=yS(Math.max(0,v)), y0=yS(0)
      ctx.beginPath(); ctx.moveTo(x1,y0); ctx.lineTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x2,y0); ctx.closePath()
      const avg=(v+pv)/2
      ctx.fillStyle=avg>35?'rgba(255,45,85,0.25)':avg>20?'rgba(255,140,53,0.2)':avg>10?'rgba(255,210,63,0.15)':'rgba(0,232,122,0.12)'
      ctx.fill()
    })
    // 乖離線（分段着色）
    for(let i=1;i<n;i++){
      const v=data[i].bias20Sm||0
      ctx.beginPath(); ctx.moveTo(xS(i-1),yS(data[i-1].bias20Sm||0)); ctx.lineTo(xS(i),yS(v))
      ctx.strokeStyle=v>35?'#ff2d55':v>20?'#ff8c35':v>10?'#ffd23f':'#00e87a'; ctx.lineWidth=1.8; ctx.stroke()
    }
    // 末点
    const last = data[n-1], lv = last.bias20Sm||0
    ctx.beginPath(); ctx.arc(xS(n-1),yS(lv),4,0,Math.PI*2)
    ctx.fillStyle=lv>35?'#ff2d55':lv>20?'#ff8c35':lv>10?'#ffd23f':'#00e87a'; ctx.fill()
    ctx.font='bold 9px "IBM Plex Mono",monospace'; ctx.textAlign='left'
    const lc=lv>35?'#ff2d55':lv>20?'#ff8c35':lv>10?'#ffd23f':'#00e87a'
    ctx.fillStyle=lc
    ctx.fillText((lv>=0?'+':'')+lv.toFixed(1)+'%', Math.min(xS(n-1)+6,W-55), Math.max(PAD.t+10,Math.min(yS(lv),PAD.t+gh-4)))
    cv.onmousemove = (e: MouseEvent) => {
      const rect=cv.getBoundingClientRect(), idx=Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1))
      if(idx<0||idx>=n) return
      drawBias(data)
      const ctx2=cv.getContext('2d')!, d=data[idx], x=xS(idx), v2=d.bias20Sm||0
      ctx2.save(); ctx2.beginPath(); ctx2.moveTo(x,PAD.t); ctx2.lineTo(x,PAD.t+gh)
      ctx2.strokeStyle=dark?'rgba(255,255,255,.15)':'rgba(0,0,0,.1)'; ctx2.lineWidth=1; ctx2.stroke()
      const sig=v2>35?'⛔禁止建仓':v2>25?'⚠高危30%试仓':v2>20?'⚡60%限仓':v2>10?'✓正常-8%':'★最佳入场'
      const lines=[d.date, '乖离率: '+(v2>=0?'+':'')+v2.toFixed(1)+'%', sig]
      const bw=140, bh=52, bx=x+8<W-bw-PAD.r?x+8:x-bw-8
      ctx2.fillStyle=dark?'rgba(7,12,24,.93)':'rgba(240,244,248,.96)'; ctx2.strokeStyle=dark?'rgba(255,140,53,.4)':'rgba(200,100,0,.3)'; ctx2.lineWidth=1
      ctx2.fillRect(bx,PAD.t+2,bw,bh); ctx2.strokeRect(bx,PAD.t+2,bw,bh)
      ;[dark?'#cce4f8':'#1a2a3a','#ff8c35',v2>35?'#ff2d55':v2>20?'#ff8c35':v2>10?'#ffd23f':'#00e87a'].forEach((c,i) => {
        ctx2.fillStyle=c; ctx2.font=(i===2?'bold ':'')+' 9px "IBM Plex Mono",monospace'; ctx2.textAlign='left'
        ctx2.fillText(lines[i], bx+6, PAD.t+13+i*16)
      })
      ctx2.restore()
    }
    cv.onmouseleave=()=>drawBias(data)
  }, [])

  // ③ renderBScoreChart 100px
  const drawBS = useCallback((data: TrendResult[]) => {
    const s = csup(bsRef, 100); if (!s) return
    const { cv, ctx, W, H } = s
    const dark = isDark()
    const PAD = { t:10, r:18, b:22, l:52 }
    const gw = W-PAD.l-PAD.r, gh = H-PAD.t-PAD.b
    const n = data.length
    ctx.fillStyle = dark?'#04070f':'#f0f4f8'; ctx.fillRect(0,0,W,H)
    const yS=(v:number)=>PAD.t+gh-(Math.max(0,Math.min(5.5,v))/5.5)*gh
    const xS=(i:number)=>PAD.l+i*(gw/(n-1))
    // 閾値背景
    ctx.fillStyle=dark?'rgba(0,232,122,0.06)':'rgba(0,232,122,0.05)'
    ctx.fillRect(PAD.l,PAD.t,gw,Math.max(0,yS(4.5)-PAD.t))
    ctx.fillStyle=dark?'rgba(0,207,255,0.05)':'rgba(0,207,255,0.04)'
    ctx.fillRect(PAD.l,yS(4.5),gw,Math.max(0,yS(4.0)-yS(4.5)))
    ;([[4.5,'≥4.5强','#00e87a'],[4.0,'≥4.0可','#00cfff'],[3.5,'3.5观望','#ffd23f']] as Array<[number,string,string]>).forEach(([v,lbl,col])=>{
      const y=yS(v)
      ctx.beginPath(); ctx.setLineDash([3,3]); ctx.moveTo(PAD.l,y); ctx.lineTo(PAD.l+gw,y)
      ctx.strokeStyle=col+'66'; ctx.lineWidth=1; ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle=col; ctx.font='8px "IBM Plex Mono",monospace'; ctx.textAlign='right'; ctx.fillText(lbl,PAD.l-3,y+3)
    })
    ctx.fillStyle=dark?'#6a8faa':'#4a6a8a'; ctx.font='8px "IBM Plex Mono",monospace'; ctx.textAlign='center'
    data.forEach((d,i)=>{ if(i%15===0||i===n-1) ctx.fillText(d.label,xS(i),H-PAD.b+12) })
    // 面積
    ctx.beginPath()
    data.forEach((d,i)=>{ const x=xS(i),y=yS(d.bScoreSm||0); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.lineTo(xS(n-1),PAD.t+gh); ctx.lineTo(PAD.l,PAD.t+gh); ctx.closePath()
    ctx.fillStyle=dark?'rgba(0,229,200,0.08)':'rgba(0,180,160,0.07)'; ctx.fill()
    // 分段着色線
    for(let i=1;i<n;i++){
      const v=data[i].bScoreSm||0
      ctx.beginPath(); ctx.moveTo(xS(i-1),yS(data[i-1].bScoreSm||0)); ctx.lineTo(xS(i),yS(v))
      ctx.strokeStyle=v>=4.5?'#00e87a':v>=4.0?'#00cfff':v>=3.5?'#ffd23f':'#ff2d55'; ctx.lineWidth=2; ctx.stroke()
    }
    const lv=data[n-1].bScoreSm||0
    const lc=lv>=4.5?'#00e87a':lv>=4.0?'#00cfff':lv>=3.5?'#ffd23f':'#ff2d55'
    ctx.beginPath(); ctx.arc(xS(n-1),yS(lv),4,0,Math.PI*2); ctx.fillStyle=lc; ctx.fill()
    ctx.font='bold 9px "IBM Plex Mono",monospace'; ctx.textAlign='left'; ctx.fillStyle=lc
    ctx.fillText('B='+lv.toFixed(2), Math.min(xS(n-1)+6,W-52), Math.max(PAD.t+10,Math.min(yS(lv),PAD.t+gh-4)))
    cv.onmousemove=(e:MouseEvent)=>{
      const rect=cv.getBoundingClientRect(), idx=Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1))
      if(idx<0||idx>=n) return
      drawBS(data)
      const ctx2=cv.getContext('2d')!, d=data[idx], x=xS(idx), v2=d.bScoreSm||0
      ctx2.save(); ctx2.beginPath(); ctx2.moveTo(x,PAD.t); ctx2.lineTo(x,PAD.t+gh)
      ctx2.strokeStyle=dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)'; ctx2.lineWidth=1; ctx2.stroke()
      const sig=v2>=4.5?'强力信号':v2>=4.0?'可操作':v2>=3.5?'观望':'止损出场'
      const lines=[d.date,'B = '+v2.toFixed(2)+' · '+sig]
      const bw=130,bh=38,bx=x+8<W-bw-PAD.r?x+8:x-bw-8
      ctx2.fillStyle=dark?'rgba(7,12,24,.93)':'rgba(240,244,248,.96)'; ctx2.strokeStyle=dark?'rgba(0,229,200,.4)':'rgba(0,180,160,.3)'; ctx2.lineWidth=1
      ctx2.fillRect(bx,PAD.t+2,bw,bh); ctx2.strokeRect(bx,PAD.t+2,bw,bh)
      const vc=v2>=4.5?'#00e87a':v2>=4.0?'#00cfff':v2>=3.5?'#ffd23f':'#ff2d55'
      ctx2.fillStyle=dark?'#cce4f8':'#1a2a3a'; ctx2.font='9px "IBM Plex Mono",monospace'; ctx2.textAlign='left'; ctx2.fillText(lines[0],bx+6,PAD.t+13)
      ctx2.fillStyle=vc; ctx2.font='bold 9px "IBM Plex Mono",monospace'; ctx2.fillText(lines[1],bx+6,PAD.t+26)
      ctx2.restore()
    }
    cv.onmouseleave=()=>drawBS(data)
  }, [])

  // ④ renderRRChart 110px
  const drawRR = useCallback((data: TrendResult[]) => {
    const s = csup(rrRef, 110); if (!s) return
    const { cv, ctx, W, H } = s
    const dark = isDark()
    const PAD = { t:12, r:18, b:22, l:52 }
    const gw = W-PAD.l-PAD.r, gh = H-PAD.t-PAD.b
    const n = data.length
    ctx.fillStyle=dark?'#04070f':'#f0f4f8'; ctx.fillRect(0,0,W,H)
    const yS=(v:number)=>PAD.t+gh-(Math.min(v,5)/5)*gh
    const xS=(i:number)=>PAD.l+i*(gw/(n-1))
    const y2=yS(2),y1=yS(1)
    ctx.fillStyle=dark?'rgba(0,240,144,.06)':'rgba(0,180,80,.04)'; ctx.fillRect(PAD.l,PAD.t,gw,Math.max(0,y2-PAD.t))
    ctx.fillStyle=dark?'rgba(255,210,63,.06)':'rgba(200,160,0,.04)'; ctx.fillRect(PAD.l,y2,gw,Math.max(0,y1-y2))
    ctx.fillStyle=dark?'rgba(255,45,85,.06)':'rgba(200,0,40,.04)'; ctx.fillRect(PAD.l,y1,gw,Math.max(0,PAD.t+gh-y1))
    ;([[2,'1:2','#00e87a'],[1,'1:1','#ff3a6e'],[3,'1:3','#00cfff']] as Array<[number,string,string]>).forEach(([v,lbl,col])=>{
      const y=yS(v)
      ctx.beginPath(); ctx.setLineDash([4,4]); ctx.moveTo(PAD.l,y); ctx.lineTo(PAD.l+gw,y)
      ctx.strokeStyle=col+'55'; ctx.lineWidth=1; ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle=col; ctx.font='8px "IBM Plex Mono",monospace'; ctx.textAlign='right'; ctx.fillText(lbl,PAD.l-3,y+3)
    })
    ctx.fillStyle=dark?'#6a8faa':'#4a6a8a'; ctx.font='8px "IBM Plex Mono",monospace'; ctx.textAlign='center'
    data.forEach((d,i)=>{ if(i%15===0||i===n-1) ctx.fillText(d.label,xS(i),H-PAD.b+12) })
    ctx.beginPath()
    data.forEach((d,i)=>{ const x=xS(i),y=yS(Math.min(d.rrAdj||d.rr||0,5)); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.lineTo(xS(n-1),PAD.t+gh); ctx.lineTo(PAD.l,PAD.t+gh); ctx.closePath()
    ctx.fillStyle=dark?'rgba(200,122,255,.07)':'rgba(160,80,220,.05)'; ctx.fill()
    for(let i=1;i<n;i++){
      const v=Math.min(data[i].rrAdj||data[i].rr||0,5)
      ctx.beginPath(); ctx.moveTo(xS(i-1),yS(Math.min(data[i-1].rrAdj||data[i-1].rr||0,5))); ctx.lineTo(xS(i),yS(v))
      ctx.strokeStyle=v>=2?'#00e87a':v>=1?'#ffd23f':'#ff2d55'; ctx.lineWidth=1.8; ctx.stroke()
    }
    const lv=Math.min(data[n-1].rrAdj||data[n-1].rr||0,5)
    const lc=lv>=2?'#00e87a':lv>=1?'#ffd23f':'#ff2d55'
    ctx.beginPath(); ctx.arc(xS(n-1),yS(lv),4,0,Math.PI*2); ctx.fillStyle=lc; ctx.fill()
    ctx.font='bold 9px "IBM Plex Mono",monospace'; ctx.textAlign='left'; ctx.fillStyle=lc
    ctx.fillText('1:'+(data[n-1].rrAdj||data[n-1].rr||0).toFixed(1), Math.min(xS(n-1)+6,W-50), Math.max(PAD.t+10,Math.min(yS(lv),PAD.t+gh-4)))
    cv.onmousemove=(e:MouseEvent)=>{
      const rect=cv.getBoundingClientRect(), idx=Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1))
      if(idx<0||idx>=n) return
      drawRR(data)
      const ctx2=cv.getContext('2d')!, d=data[idx], x=xS(idx), v2=d.rrAdj||d.rr||0
      ctx2.save(); ctx2.beginPath(); ctx2.moveTo(x,PAD.t); ctx2.lineTo(x,PAD.t+gh)
      ctx2.strokeStyle=dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)'; ctx2.lineWidth=1; ctx2.stroke()
      const sig=v2>=3?'极佳建仓时机':v2>=2?'可操作':v2>=1?'偏低谨慎':'盈亏比不足'
      const lines=[d.date,'盈亏比: 1:'+v2.toFixed(1)+' · '+sig,'止损: '+((d.stopAdj||d.stop||0).toFixed(2))+'元','目标: '+((d.target||0).toFixed(2))+'元']
      const bw=155,bh=64,bx=x+8<W-bw-PAD.r?x+8:x-bw-8, vc=v2>=2?'#00e87a':v2>=1?'#ffd23f':'#ff2d55'
      ctx2.fillStyle=dark?'rgba(7,12,24,.93)':'rgba(240,244,248,.96)'; ctx2.strokeStyle=vc+'66'; ctx2.lineWidth=1
      ctx2.fillRect(bx,PAD.t+2,bw,bh); ctx2.strokeRect(bx,PAD.t+2,bw,bh)
      lines.forEach((l,li)=>{
        ctx2.fillStyle=li===0?(dark?'#cce4f8':'#1a2a3a'):li===1?vc:(dark?'#8a9ab0':'#4a6a8a')
        ctx2.font=(li===1?'bold ':'')+' 9px "IBM Plex Mono",monospace'; ctx2.textAlign='left'; ctx2.fillText(l,bx+6,PAD.t+13+li*14)
      })
      ctx2.restore()
    }
    cv.onmouseleave=()=>drawRR(data)
  }, [])

  // ⑤ renderPriceCanvas 200px（V6の分段着色 + 対数Y軸）
  const drawPrice = useCallback((data: TrendResult[]) => {
    const s = csup(priceRef, 200); if (!s) return
    const { cv, ctx, W, H } = s
    const dark = isDark()
    const PAD = { t:14, r:64, b:28, l:62 }
    const gw = W-PAD.l-PAD.r, gh = H-PAD.t-PAD.b
    const n = data.length
    ctx.fillStyle=dark?'#04070f':'#f0f4f8'; ctx.fillRect(0,0,W,H)
    const prices=data.map(d=>d.close)
    const stops =data.map(d=>d.stopAdj||d.stop||0).filter(v=>v>0)
    const tgts  =data.map(d=>d.target||0).filter(v=>v>0)
    const allVals=[...prices,...stops,...tgts].filter(v=>v>0)
    const minP=Math.min(...allVals)*0.97, maxP=Math.max(...allVals)*1.02
    const logMin=Math.log(minP), logMax=Math.log(maxP)
    const yL=(v:number)=>v>0?PAD.t+gh-(Math.log(v)-logMin)/(logMax-logMin)*gh:PAD.t+gh
    const xS=(i:number)=>PAD.l+i*(gw/(n-1))
    // Y目盛
    const rng=maxP-minP
    const step=rng>500?100:rng>100?20:rng>20?5:rng>5?1:0.5
    let tk=Math.ceil(minP/step)*step
    while(tk<=maxP){
      const y=yL(tk)
      if(y>=PAD.t&&y<=PAD.t+gh){
        ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(PAD.l+gw,y)
        ctx.strokeStyle=dark?'rgba(0,207,255,0.06)':'rgba(0,100,180,0.08)'; ctx.lineWidth=1; ctx.stroke()
        ctx.fillStyle=dark?'#6a8faa':'#4a6a8a'; ctx.font='9px "IBM Plex Mono",monospace'; ctx.textAlign='right'
        ctx.fillText(tk>=1000?tk.toFixed(0):tk>=100?tk.toFixed(1):tk.toFixed(2),PAD.l-4,y+3.5)
      }
      tk+=step
    }
    // X
    ctx.fillStyle=dark?'#6a8faa':'#4a6a8a'; ctx.font='9px "IBM Plex Mono",monospace'; ctx.textAlign='center'
    data.forEach((d,i)=>{ if(i%15===0||i===n-1) ctx.fillText(d.label,xS(i),H-PAD.b+14) })
    // 目標線（緑破線）
    if(data.some(d=>d.target)){
      ctx.beginPath(); ctx.setLineDash([6,4])
      data.forEach((d,i)=>{ if(!d.target)return; const x=xS(i),y=yL(d.target); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
      ctx.strokeStyle=dark?'rgba(0,232,122,0.45)':'rgba(0,140,70,.4)'; ctx.lineWidth=1.2; ctx.stroke(); ctx.setLineDash([])
    }
    // 止損線（赤破線）
    if(data.some(d=>d.stopAdj||d.stop)){
      ctx.beginPath(); ctx.setLineDash([4,4])
      data.forEach((d,i)=>{ const sv=d.stopAdj||d.stop||0; if(!sv)return; const x=xS(i),y=yL(sv); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
      ctx.strokeStyle=dark?'rgba(255,45,85,0.5)':'rgba(200,0,40,.4)'; ctx.lineWidth=1.2; ctx.stroke(); ctx.setLineDash([])
    }
    // 面積
    ctx.beginPath(); data.forEach((d,i)=>{ const x=xS(i),y=yL(d.close); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.lineTo(xS(n-1),PAD.t+gh); ctx.lineTo(PAD.l,PAD.t+gh); ctx.closePath()
    const g=ctx.createLinearGradient(0,PAD.t,0,PAD.t+gh)
    g.addColorStop(0,dark?'rgba(0,207,255,0.12)':'rgba(0,100,180,0.08)')
    g.addColorStop(1,dark?'rgba(0,207,255,0.01)':'rgba(0,100,180,0.01)')
    ctx.fillStyle=g; ctx.fill()
    // 分段着色価格線
    for(let i=1;i<n;i++){
      ctx.beginPath(); ctx.moveTo(xS(i-1),yL(data[i-1].close)); ctx.lineTo(xS(i),yL(data[i].close))
      ctx.strokeStyle=data[i].changePct>=0?'#00e87a':'#ff2d55'; ctx.lineWidth=1.5; ctx.stroke()
    }
    // 末点止損/目標ラベル
    const ld=data[n-1]
    if(ld.stopAdj||ld.stop){
      const sv=ld.stopAdj||ld.stop
      ctx.font='bold 8px "IBM Plex Mono",monospace'; ctx.textAlign='left'; ctx.fillStyle='#ff2d55'
      ctx.fillText('止损'+sv.toFixed(2), xS(n-1)+4, yL(sv)-3)
    }
    if(ld.target){
      ctx.font='bold 8px "IBM Plex Mono",monospace'; ctx.textAlign='left'; ctx.fillStyle='#00e87a'
      ctx.fillText('目标'+ld.target.toFixed(2), xS(n-1)+4, yL(ld.target)+10)
    }
    cv.onmousemove=(e:MouseEvent)=>{
      const rect=cv.getBoundingClientRect(), idx=Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1))
      if(idx<0||idx>=n) return
      drawPrice(data)
      const ctx2=cv.getContext('2d')!, d=data[idx], x=xS(idx)
      ctx2.save(); ctx2.beginPath(); ctx2.moveTo(x,PAD.t); ctx2.lineTo(x,PAD.t+gh)
      ctx2.strokeStyle=dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'; ctx2.lineWidth=1; ctx2.stroke()
      ctx2.beginPath(); ctx2.arc(x,yL(d.close),4,0,Math.PI*2); ctx2.fillStyle=d.changePct>=0?'#00e87a':'#ff2d55'; ctx2.fill()
      const sv=d.stopAdj||d.stop||0, tv=d.target||0, rr=d.rrAdj||d.rr||0
      const lines=[d.date+'  '+d.close.toFixed(2)+'元',(d.changePct>=0?'+':'')+d.changePct.toFixed(2)+'%','止损:'+sv.toFixed(2)+'  目标:'+tv.toFixed(2),'盈亏比 1:'+rr.toFixed(1)]
      const bw=160,bh=62, bx=x+8<W-bw-PAD.r?x+8:x-bw-8, by=PAD.t+4
      ctx2.fillStyle=dark?'rgba(7,12,24,.93)':'rgba(240,244,248,.96)'
      ctx2.strokeStyle=d.changePct>=0?'rgba(0,232,122,0.35)':'rgba(255,45,85,0.35)'; ctx2.lineWidth=1
      ctx2.fillRect(bx,by,bw,bh); ctx2.strokeRect(bx,by,bw,bh)
      ;[dark?'#cce4f8':'#1a2a3a',d.changePct>=0?'#00e87a':'#ff2d55','#8aabcc',rr>=2?'#00e87a':rr>=1?'#ffd23f':'#ff2d55'].forEach((c,i)=>{
        ctx2.fillStyle=c; ctx2.font='9px "IBM Plex Mono",monospace'; ctx2.textAlign='left'; ctx2.fillText(lines[i],bx+6,by+13+i*14)
      })
      ctx2.restore()
    }
    cv.onmouseleave=()=>drawPrice(data)
  }, [])

  // 全図描画
  const drawAll = useCallback((data: TrendResult[]) => {
    setTimeout(() => {
      drawTrend(data); drawBias(data); drawBS(data); drawRR(data); drawPrice(data)
    }, 50)
  }, [drawTrend, drawBias, drawBS, drawRR, drawPrice])

  // マウント時に自動でデータ取得（V6と同様に即座にロード）
  useEffect(() => {
    handleLoad()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // マウント時1回のみ

  // データロード後に描画
  useEffect(() => {
    if (loaded && results.length > 0) drawAll(results)
  }, [loaded, results, drawAll])

  // データ取得
  async function handleLoad() {
    setLoading(true); setErrMsg('')
    try {
      const res = await fetch(`/api/kline?code=${code}&limit=160`)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || '数据获取失败')
      const bars: KBar[] = json.data || []
      if (bars.length === 0) throw new Error('暂无K线数据')
      const calc = calcResults(bars)
      setResults(calc); setLoaded(true)
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : '加载失败')
    } finally { setLoading(false) }
  }

  const dark = typeof window !== 'undefined' ? isDark() : true
  const legendItems = [
    { color:'#00cfff', label:'①趋势', desc:'均线多头排列（MA5>MA20>MA60）' },
    { color:'#ffd23f', label:'②量价', desc:'量涨价涨健康，放量下跌扣分' },
    { color:'#00e87a', label:'③RS',  desc:'个股涨跌幅强弱表现' },
    { color:'#a78bfa', label:'综合',  desc:'三维度均值（基准=3.0）', dash:true },
    { color:'#ff8c35', label:'⑧乖离', desc:'近20日涨幅/MA20，红=过热' },
    { color:'#00e5c8', label:'B分',   desc:'八维度综合≥4.5强力·≥4.0可操作' },
    { color:'#c87aff', label:'盈亏比R:R', desc:'目标收益/止损风险，≥2.0绿色' },
  ]
  const m = 'IBM Plex Mono,monospace'
  const cardS: React.CSSProperties = { backgroundColor:'var(--bg2)', border:'1px solid var(--bd)', borderRadius:8, marginTop:12, overflow:'hidden' }
  const lblS: React.CSSProperties  = { fontFamily:m, fontSize:9, letterSpacing:'0.12em', color:'var(--t3)', textTransform:'uppercase' }
  const cvWrap = (px: number): React.CSSProperties => ({ position:'relative', width:'100%', height:px, marginBottom:10 })
  const cvLabel = (text: string, color: string): React.CSSProperties => ({
    position:'absolute', top:4, left:4, zIndex:1,
    fontFamily:m, fontSize:9, color, letterSpacing:'2px',
    padding:'3px 6px', background:'rgba(0,0,0,0.3)',
  })

  return (
    <div style={cardS}>
      {/* ヘッダー */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--bd)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:m, fontSize:9, color:'var(--t3)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
          📈 90天动态走势 · 三维度强度曲线
        </span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontFamily:m, fontSize:11, color:'var(--c)' }}>{code}</span>
          {errMsg && <span style={{ fontSize:10, color:'var(--r)' }}>{errMsg}</span>}
          {loading && <span style={{ fontSize:10, color:'var(--c)', fontFamily:m }}>⟳ 加载中…</span>}
          {loaded && (
            <button onClick={handleLoad} style={{ fontFamily:m, fontSize:10, padding:'3px 10px', border:'1px solid var(--c)', borderRadius:3, cursor:'pointer', color:'var(--c)', backgroundColor:'transparent' }}>
              🔄 刷新
            </button>
          )}
        </div>
      </div>

      {loaded && (
        <div style={{ padding:'12px 16px' }}>
          {/* Legend */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:14, padding:'10px 14px', backgroundColor:'var(--bg3)', borderRadius:4, border:'1px solid var(--bd)' }}>
            {legendItems.map(it => (
              <div key={it.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:24, height:3, background:it.color, borderRadius:2, borderTop: it.dash ? `2px dashed ${it.color}` : undefined }}/>
                <span style={{ fontSize:11, color:'var(--t2)' }}>
                  <b style={{ color:it.color }}>{it.label}</b>：{it.desc}
                </span>
              </div>
            ))}
          </div>

          {/* ① 趋势强度图 280px */}
          <div style={cvWrap(280)}>
            <canvas ref={trendRef} style={{ width:'100%', height:'100%' }}/>
          </div>

          {/* ⑧ 乖離図 120px */}
          <div style={{ ...cvWrap(120), position:'relative' }}>
            <div style={cvLabel('⑧ 乖离率 · 买入安全边际', '#ff8c35')}>⑧ 乖离率 · 买入安全边际</div>
            <canvas ref={biasRef} style={{ width:'100%', height:'100%' }}/>
          </div>

          {/* B分 100px */}
          <div style={{ ...cvWrap(100), position:'relative' }}>
            <div style={cvLabel('基准B分 · 八维度综合（含⑧乖离惩罚）', '#00e5c8')}>基准B分 · 八维度综合（含⑧乖离惩罚）</div>
            <canvas ref={bsRef} style={{ width:'100%', height:'100%' }}/>
          </div>

          {/* RR比 110px */}
          <div style={{ ...cvWrap(110), position:'relative' }}>
            <div style={cvLabel('盈亏比 R:R · 止损/目标动态比', '#c87aff')}>盈亏比 R:R · 止损/目标动态比</div>
            <canvas ref={rrRef} style={{ width:'100%', height:'100%' }}/>
          </div>

          {/* 価格+止損+目標 200px */}
          <div style={{ ...cvWrap(200), position:'relative' }}>
            <div style={cvLabel('价格走势', 'var(--t2)')}>
              价格走势 · <span style={{ color:'#ff2d55' }}>── 止损线</span> · <span style={{ color:'#00e87a' }}>── 目标线</span>
            </div>
            <canvas ref={priceRef} style={{ width:'100%', height:'100%' }}/>
          </div>

          {/* 摘要 */}
          <TrendSummary data={results} />

          {/* 注釈 */}
          <div style={{ fontSize:9, color:'var(--t3)', fontFamily:m, marginTop:6, lineHeight:1.6, paddingTop:8, borderTop:'1px solid var(--bd)' }}>
            ⚠️ 数据：东方财富历史K线（实际交易数据）· ⑧乖离率=近20日涨幅/MA20乖离，红色区域为高危（&gt;20%）买入慎重 · B分由①②③计算，⑧维度已扣分 · 过去表现不代表未来走势
          </div>
        </div>
      )}
    </div>
  )
}

// 统计摘要コンポーネント
function TrendSummary({ data }: { data: TrendResult[] }) {
  if (!data.length) return null
  const n = data.length
  const comps = data.map(d => d.comp)
  const rss   = data.map(d => d.rs)
  const r15   = comps.slice(-15).reduce((a,b)=>a+b,0) / Math.min(15,n)
  const p15a  = comps.slice(-30,-15)
  const p15av = p15a.length ? p15a.reduce((a,b)=>a+b,0)/p15a.length : r15
  const dir   = r15>p15av+0.15?'📈 上升':r15<p15av-0.15?'📉 下降':'➡️ 横盘'
  const dc    = r15>p15av+0.15?'#00e87a':r15<p15av-0.15?'#ff2d55':'#ffd23f'
  let rsStrk  = 0; for(let i=n-1;i>=0;i--){if(rss[i]>=3)rsStrk++;else break;}
  const av    = comps.reduce((a,b)=>a+b,0)/n
  const gr    = av>=4?'⭐⭐⭐ 强势':av>=3.3?'⭐⭐ 中强':av>=2.7?'⭐ 中性':'⚠️ 偏弱'
  const gc    = av>=4?'#00e87a':av>=3.3?'#00cfff':av>=2.7?'#ffd23f':'#ff2d55'
  const lv    = data[n-1]?.bias20Sm||data[n-1]?.bias20||0
  const lc    = lv>35?'#ff2d55':lv>20?'#ff8c35':lv>10?'#ffd23f':'#00e87a'
  const lt    = lv>35?'⛔禁建仓':lv>20?'⚠限仓60%':lv>10?'⚡正常-8%':'★最佳入场'
  const bv    = data[n-1]?.bScoreSm||0
  const bc    = bv>=4.5?'#00e87a':bv>=4.0?'#00cfff':bv>=3.5?'#ffd23f':'#ff2d55'
  const bt    = bv>=4.5?'强力':bv>=4.0?'可操作':bv>=3.5?'观望':'止损'
  const rv    = data[n-1]?.rrAdj||data[n-1]?.rr||0
  const rc    = rv>=3?'#00e87a':rv>=2?'#00cfff':rv>=1?'#ffd23f':'#ff2d55'
  const rt    = rv>=3?'极佳时机':rv>=2?'可操作':rv>=1?'偏低':' R:R不足'
  const sv    = data[n-1]?.stopAdj||data[n-1]?.stop||0
  const pv    = data[n-1]?.close||0
  const pct   = pv>0?((sv-pv)/pv*100).toFixed(1):'—'

  const boxes = [
    { lb:'90日综合评级', v:gr, c:gc },
    { lb:'趋势方向', v:dir, c:dc },
    { lb:'近30日均强度', v:(comps.slice(-30).reduce((a,b)=>a+b,0)/Math.min(30,n)).toFixed(2), c:'#00cfff' },
    { lb:'连续RS≥3天', v:rsStrk+'天', c:rsStrk>=10?'#00e87a':rsStrk>=5?'#ffd23f':'#ff2d55' },
    { lb:'⑧乖离(近20日)', v:(lv>=0?'+':'')+lv.toFixed(1)+'%  '+lt, c:lc },
    { lb:'B分(含⑧)', v:bv.toFixed(2)+' '+bt, c:bc },
    { lb:'盈亏比 R:R', v:'1:'+rv.toFixed(1)+'  '+rt, c:rc },
    { lb:'当前止损价', v:sv>0?sv.toFixed(2)+'元('+pct+'%)':'—', c:'#ff3a6e' },
  ]

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8, marginBottom:10 }}>
      {boxes.map(({ lb, v, c }) => (
        <div key={lb} style={{ backgroundColor:'var(--bg3)', border:'1px solid var(--bd)', padding:'10px 12px', borderRadius:4, textAlign:'center' }}>
          <div style={{ fontSize:9, color:'var(--t2)', fontFamily:'IBM Plex Mono,monospace', marginBottom:5 }}>{lb}</div>
          <div style={{ fontSize:16, fontFamily:'IBM Plex Mono,monospace', fontWeight:700, color:c }}>{v}</div>
        </div>
      ))}
    </div>
  )
}
