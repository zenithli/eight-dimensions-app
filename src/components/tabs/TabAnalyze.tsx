'use client'
import React from 'react'

import { useState } from 'react'
import { Card } from '@/components/shared/Card'
import { AnalysisResultCard } from '@/components/shared/AnalysisResultCard'
import { addLog } from '@/lib/logger'
import type { AnalysisResult } from '@/types/domain'

const QUICK = [
  { code: '000815', name: '美利云'  },
  { code: '601225', name: '陕西煤业'},
  { code: '601101', name: '昊华能源'},
  { code: '159326', name: '电网ETF' },
]

const S = {
  row: { display:'flex', gap:8, flexWrap:'wrap' as const, marginBottom:10 },
  input: {
    flex: 1, minWidth: 180,
    backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
    color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:13,
    padding:'8px 12px', borderRadius:8, outline:'none',
  },
  btn: (disabled: boolean) => ({
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'8px 20px',
    backgroundColor:'rgba(56,200,255,0.10)',
    border:'1px solid rgba(56,200,255,0.40)',
    color:'var(--c)', fontFamily:'IBM Plex Mono', fontSize:11,
    borderRadius:8, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition:'all .15s',
  }),
  quickRow: { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' as const },
  quickLabel: { color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:9, letterSpacing:'0.1em' },
  quickBtn: (disabled: boolean) => ({
    fontFamily:'IBM Plex Mono', fontSize:10,
    padding:'4px 10px', border:'1px solid var(--bd)',
    color:'var(--t2)', borderRadius:6,
    backgroundColor:'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1, transition:'all .15s',
  }),
  err: {
    marginTop:10, padding:'6px 12px',
    backgroundColor:'rgba(255,58,110,0.08)',
    border:'1px solid rgba(255,58,110,0.30)',
    borderRadius:6, color:'var(--r)',
    fontFamily:'IBM Plex Mono', fontSize:11,
  },
  empty: {
    display:'flex', flexDirection:'column' as const,
    alignItems:'center', justifyContent:'center',
    padding:'80px 0', gap:10,
  },
  emptyBox: {
    width:48, height:48,
    border:'1px solid var(--bd)', borderRadius:12,
    display:'flex', alignItems:'center', justifyContent:'center',
    color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:18,
  },
  loading: {
    display:'flex', flexDirection:'column' as const,
    alignItems:'center', justifyContent:'center',
    padding:'64px 0', gap:16,
  },
  spinner: {
    position:'relative' as const, width:56, height:56,
  },
  spinnerOuter: {
    width:56, height:56, borderRadius:'50%',
    border:'2px solid var(--bd)',
    position:'absolute' as const, top:0, left:0,
  },
  spinnerInner: {
    width:56, height:56, borderRadius:'50%',
    border:'2px solid transparent',
    borderTopColor:'var(--c)',
    position:'absolute' as const, top:0, left:0,
    animation:'spin 0.8s linear infinite',
  },
  spinnerLabel: {
    position:'absolute' as const,
    inset:0, display:'flex', alignItems:'center', justifyContent:'center',
    color:'var(--c)', fontFamily:'IBM Plex Mono', fontSize:10,
  },
}

export function TabAnalyze() {
  const [code, setCode]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<AnalysisResult | null>(null)
  const [error, setError]       = useState('')
  const [progress, setProgress] = useState('')

  async function run(targetCode?: string) {
    const c = (targetCode ?? code).trim()
    if (!/^\d{6}$/.test(c)) { setError('请输入正确的6位股票代码'); return }
    const apiKey = localStorage.getItem('qtkey') || ''
    if (!apiKey) { setError('请先在顶部输入并保存 Anthropic API Key'); return }

    setLoading(true); setError(''); setResult(null)
    setProgress('① 获取实时行情…')
    addLog(`开始分析 ${c}`, 'step', '', 'analyze')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, apiKey }),
      })
      setProgress('② AI 八维度分析中…')
      addLog('行情获取成功，AI分析中…', 'api', '', 'analyze')
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      const data = json.data as AnalysisResult
      setResult(data)
      addLog(
        `${data.name} 分析完成`,
        'ok',
        `B分=${data.totalScore} 信号=${data.signal} 止损=¥${data.stopLoss}`,
        'analyze'
      )
      // localStorage にも保存（DB未接続時のフォールバック用）
      try {
        const LS_KEY = 'history_v7'
        const existing = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
        const newEntry = {
          id:          Date.now(),
          code:        data.code,
          name:        data.name,
          price:       data.price,
          changePct:   data.changePct,
          totalScore:  data.totalScore,
          signal:      data.signal,
          stopLoss:    data.stopLoss,
          targetPrice: data.targetPrice,
          riskRatio:   data.riskRatio,
          summary:     data.summary,
          scoresJson:  JSON.stringify(data.scores ?? []),
          createdAt:   new Date().toISOString(),
        }
        localStorage.setItem(LS_KEY, JSON.stringify([newEntry, ...existing].slice(0, 100)))
      } catch { /* localStorage保存失敗は無視 */ }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '分析失败，请重试'
      setError(msg)
      addLog(msg, 'error', '', 'analyze')
    } finally {
      setLoading(false); setProgress('')
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Card title="SINGLE STOCK ANALYSIS · 单股八维度分析">
        <div style={S.row}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
            onKeyDown={e => e.key === 'Enter' && !loading && run()}
            placeholder="输入6位股票代码，如 000815"
            maxLength={6}
            style={S.input}
          />
          <button onClick={() => run()} disabled={loading} style={S.btn(loading)}>
            {loading ? '⟳ 分析中…' : '🔍 开始分析'}
          </button>
          {result && (
            <button onClick={() => { setResult(null); run() }} disabled={loading}
              style={{
                fontFamily:'IBM Plex Mono', fontSize:10, padding:'9px 14px',
                border:'1px solid rgba(247,201,72,0.4)', color:'var(--y)',
                backgroundColor:'transparent', borderRadius:6, cursor:'pointer',
                whiteSpace:'nowrap' as const, opacity: loading ? 0.5 : 1,
              }}>
              ↺ 强制刷新
            </button>
          )}
        </div>
        <div style={S.quickRow}>
          <span style={S.quickLabel}>快速选择：</span>
          {QUICK.map(q => (
            <button key={q.code} disabled={loading}
              onClick={() => { setCode(q.code); run(q.code) }}
              style={S.quickBtn(loading)}>
              {q.name}
            </button>
          ))}
        </div>
        {error && <div style={S.err}>✕ {error}</div>}
      </Card>

      {loading && (
        <div style={S.loading}>
          <div style={S.spinner}>
            <div style={S.spinnerOuter} />
            <div style={S.spinnerInner} />
            <div style={S.spinnerLabel}>AI</div>
          </div>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:11 }}>
            {progress || '分析中…'}
          </span>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:9, opacity:0.6 }}>
            Claude AI 正在搜索今日行情并进行八维度评估
          </span>
        </div>
      )}

      {!result && !loading && (
        <div style={S.empty}>
          <div style={S.emptyBox}>8D</div>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:13 }}>
            输入股票代码，开始八维度分析
          </span>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:10, opacity:0.6 }}>
            ①趋势 ②量能 ③Alpha ④威科夫 ⑤板块 ⑥资金 ⑦基本面 ⑧乖离
          </span>
        </div>
      )}

      {result && !loading && <AnalysisResultCard result={result} />}

      {/* ④ 止損仓位計算器 */}
      {result && !loading && (
        <StopLossCalc price={result.price} stopLoss={result.stopLoss} />
      )}
    </div>
  )
}

// ── 止損仓位計算器 ──
function StopLossCalc({ price, stopLoss }: { price: number; stopLoss: number }) {
  const [capital, setCapital] = React.useState('100000')
  const [maxLoss, setMaxLoss] = React.useState('2')
  const [open, setOpen] = React.useState(false)

  const maxLossAmt   = parseFloat(capital||'0') * parseFloat(maxLoss||'0') / 100
  const riskPerShare = price - stopLoss
  const maxShares    = riskPerShare > 0 ? Math.floor(maxLossAmt / riskPerShare / 100) * 100 : 0
  const posAmt       = maxShares * price
  const posRatio     = parseFloat(capital||'1') > 0 ? posAmt / parseFloat(capital) * 100 : 0

  const inStyle = {
    width:'100%', backgroundColor:'var(--bg3)' as const, border:'1px solid var(--bd)',
    color:'var(--t)', padding:'6px 8px', borderRadius:5,
    fontFamily:'IBM Plex Mono', fontSize:12, outline:'none',
  }

  return (
    <div style={{ backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
      borderRadius:12, marginTop:8, overflow:'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding:'10px 16px', cursor:'pointer',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.12em' }}>
          POSITION CALC · 止损仓位计算器
        </span>
        <span style={{ color:'var(--t3)', fontSize:11 }}>{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--bd)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:12 }}>
            <div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:4 }}>总资金（元）</div>
              <input type="number" value={capital} onChange={e => setCapital(e.target.value)} style={inStyle} />
            </div>
            <div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:4 }}>最大亏损（%）</div>
              <input type="number" value={maxLoss} onChange={e => setMaxLoss(e.target.value)} style={inStyle} />
            </div>
            <div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:4 }}>止损价 / 入场价</div>
              <div style={{ ...inStyle, color:'var(--t2)' }}>¥{stopLoss.toFixed(2)} / ¥{price.toFixed(2)}</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:12 }}>
            {[
              { label:'最大持股数', val:`${maxShares.toLocaleString()}股`, color:'var(--c)' },
              { label:'建仓金额',   val:`¥${posAmt.toLocaleString(undefined,{maximumFractionDigits:0})}`, color:'var(--y)' },
              { label:'仓位比例',   val:`${posRatio.toFixed(1)}%`, color: posRatio>50?'var(--r)':posRatio>30?'var(--y)':'var(--g)' },
            ].map(({label, val, color}) => (
              <div key={label} style={{ backgroundColor:'var(--bg3)', borderRadius:8, padding:'10px 12px',
                border:'1px solid rgba(56,200,255,0.15)' }}>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:4 }}>{label}</div>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:16, fontWeight:700, color }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginTop:8 }}>
            公式：最大亏损额 ÷ (入场价 − 止损价) = 最大持股数 · 每股风险¥{riskPerShare.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}
