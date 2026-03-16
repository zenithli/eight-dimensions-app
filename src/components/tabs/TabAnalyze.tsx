'use client'
/**
 * TabAnalyze.tsx  fix202603170124
 * 単株分析タブ：入力/ローディング/結果表示
 * AnalysisResultCard が9区段（V6完全一致）を担当
 */
import React from 'react'
import { useState } from 'react'
import { Card } from '@/components/shared/Card'
import { AnalysisResultCard } from '@/components/shared/AnalysisResultCard'
import { addLog } from '@/lib/logger'
import type { AnalysisResult } from '@/types/domain'

const QUICK = [
  { code: '000815', name: '美利云'   },
  { code: '601225', name: '陕西煤业' },
  { code: '601101', name: '昊华能源' },
  { code: '159326', name: '电网ETF'  },
]

const S = {
  row: { display:'flex', gap:8, flexWrap:'wrap' as const, marginBottom:10 },
  input: {
    flex:1, minWidth:180,
    backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
    color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:24,
    padding:'10px 14px', borderRadius:6, outline:'none',
    letterSpacing:'0.2em',
  },
  btn: (disabled: boolean) => ({
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'10px 22px',
    backgroundColor: disabled ? 'rgba(56,200,255,0.05)' : 'rgba(56,200,255,0.10)',
    border:'1px solid rgba(56,200,255,0.40)',
    color:'var(--c)', fontFamily:'IBM Plex Mono', fontSize:12,
    borderRadius:6, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition:'all .15s', whiteSpace:'nowrap' as const,
  }),
  refreshBtn: {
    fontFamily:'IBM Plex Mono', fontSize:10, padding:'9px 14px',
    border:'1px solid rgba(247,201,72,0.4)', color:'var(--y)',
    backgroundColor:'transparent', borderRadius:6, cursor:'pointer',
    whiteSpace:'nowrap' as const,
  },
  quickRow: { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' as const, marginTop:6 },
  quickLabel: { color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:9, letterSpacing:'0.1em' },
  quickBtn: (disabled: boolean) => ({
    fontFamily:'IBM Plex Mono', fontSize:10,
    padding:'4px 12px', border:'1px solid var(--bd)',
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
    display:'flex', alignItems:'center', gap:8,
  },
  empty: {
    display:'flex', flexDirection:'column' as const,
    alignItems:'center', justifyContent:'center',
    padding:'80px 0', gap:10,
  },
  loading: {
    display:'flex', flexDirection:'column' as const,
    alignItems:'center', justifyContent:'center',
    padding:'64px 0', gap:16,
  },
  spinner: { position:'relative' as const, width:56, height:56 },
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
    position:'absolute' as const, inset:0,
    display:'flex', alignItems:'center', justifyContent:'center',
    color:'var(--c)', fontFamily:'IBM Plex Mono', fontSize:10,
  },
}

// ── 最近分析 RECENT バー ──
function RecentBar({ onSelect, disabled }: { onSelect:(code:string)=>void; disabled:boolean }) {
  const [recent, setRecent] = React.useState<Array<{code:string;name:string;B:number;bias:string}>>([])
  React.useEffect(() => {
    try {
      const LS_KEY = 'history_v7'
      const h = JSON.parse(localStorage.getItem(LS_KEY)||'[]')
      const seen = new Set<string>()
      const items: Array<{code:string;name:string;B:number;bias:string}> = []
      for (const e of h) {
        if (!seen.has(e.code) && items.length < 3) {
          seen.add(e.code)
          items.push({ code:e.code, name:e.name, B:e.totalScore||0, bias:'—' })
        }
      }
      setRecent(items)
    } catch { /* ignore */ }
  }, [])
  if (recent.length === 0) return null
  return (
    <div style={{ marginBottom:10, padding:'7px 12px',
      backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
      borderRadius:6, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)',
        letterSpacing:'0.1em', flexShrink:0 }}>RECENT · 最近分析</span>
      {recent.map(r => (
        <button key={r.code} disabled={disabled} onClick={() => onSelect(r.code)}
          style={{ fontFamily:'IBM Plex Mono', fontSize:10, padding:'3px 10px',
            border:'1px solid var(--bd2)', borderRadius:4,
            color:'var(--t2)', backgroundColor:'transparent',
            cursor: disabled?'not-allowed':'pointer', opacity: disabled?0.4:1 }}>
          {r.name}
          <span style={{ color:'var(--c)', marginLeft:5 }}>B{r.B.toFixed(2)}</span>
        </button>
      ))}
    </div>
  )
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
      setProgress('② Claude AI八维度分析中…')
      const res  = await fetch('/api/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ code: c, apiKey }),
      })
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
      // localStorage保存
      try {
        const LS_KEY = 'history_v7'
        const existing = JSON.parse(localStorage.getItem(LS_KEY)||'[]')
        const newEntry = {
          id: Date.now(), code:data.code, name:data.name,
          price:data.price, changePct:data.changePct,
          totalScore:data.totalScore, signal:data.signal,
          stopLoss:data.stopLoss, targetPrice:data.targetPrice,
          riskRatio:data.riskRatio, summary:data.summary,
          scoresJson:JSON.stringify(data.scores??[]),
          createdAt:new Date().toISOString(),
        }
        localStorage.setItem(LS_KEY, JSON.stringify([newEntry,...existing].slice(0,100)))
      } catch { /* ignore */ }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '分析失败，请重试'
      setError(msg); addLog(msg, 'error', '', 'analyze')
    } finally {
      setLoading(false); setProgress('')
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Card title="SINGLE STOCK ANALYSIS · 单股八维度分析">
        {/* RECENT バー */}
        <RecentBar onSelect={c => { setCode(c); run(c) }} disabled={loading}/>
        <div style={S.row}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
            onKeyDown={e => e.key==='Enter' && !loading && run()}
            placeholder="股票代码（A股6位）"
            maxLength={6}
            style={S.input}
          />
          <button onClick={() => run()} disabled={loading} style={S.btn(loading)}>
            {loading ? '⟳ 分析中…' : '🔍 AI 分析'}
          </button>
          {result && (
            <button onClick={() => { setResult(null); run() }} disabled={loading} style={S.refreshBtn}>
              ↺ 强制刷新
            </button>
          )}
        </div>
        <div style={S.quickRow}>
          <span style={S.quickLabel}>快速选择：</span>
          {QUICK.map(q => (
            <button key={q.code} disabled={loading}
              onClick={() => { setCode(q.code); run(q.code) }}
              style={S.quickBtn(loading)}>{q.name}</button>
          ))}
        </div>
        {error && (
          <div style={S.err}>
            <span>✕</span><span>{error}</span>
          </div>
        )}
      </Card>

      {/* ローディング */}
      {loading && (
        <div style={S.loading}>
          <div style={S.spinner}>
            <div style={S.spinnerOuter}/>
            <div style={S.spinnerInner}/>
            <div style={S.spinnerLabel}>AI</div>
          </div>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:11 }}>
            {progress || '分析中…'}
          </span>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:9, opacity:0.6 }}>
            ① 东方财富实时接口 → ② Claude AI八维度 → ③ 含⑧乖离率评分
          </span>
        </div>
      )}

      {/* 空の状態 */}
      {!result && !loading && (
        <div style={S.empty}>
          <div style={{
            width:48, height:48, border:'1px solid var(--bd)', borderRadius:12,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:18,
          }}>8D</div>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:13 }}>
            输入股票代码，开始八维度分析
          </span>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:10, opacity:0.6 }}>
            ①趋势 ②量能 ③Alpha ④威科夫 ⑤板块 ⑥资金 ⑦基本面 ⑧乖离率控制
          </span>
        </div>
      )}

      {/* 分析結果（9区段） */}
      {result && !loading && <AnalysisResultCard result={result}/>}
    </div>
  )
}
