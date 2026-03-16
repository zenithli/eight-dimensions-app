'use client'
/**
 * TabAnalyze.tsx  fix202603170330
 * V6仕様LOGシステム + 詳細ステップ表示
 */
import React from 'react'
import { useState, useRef, useCallback } from 'react'
import { Card } from '@/components/shared/Card'
import { AnalysisResultCard } from '@/components/shared/AnalysisResultCard'
import type { AnalysisResult } from '@/types/domain'

const QUICK = [
  { code: '000815', name: '美利云'   },
  { code: '601225', name: '陕西煤业' },
  { code: '601101', name: '昊华能源' },
  { code: '159326', name: '电网ETF'  },
]

// ── LOGシステム ──
type LogLevel = 'step' | 'ok' | 'api' | 'warn' | 'error' | 'info'
interface LogEntry {
  id: number; ts: string; level: LogLevel
  msg: string; detail: string; tag: string
}
let logIdSeq = 0

const LOG_COLORS: Record<LogLevel, string> = {
  step:  '#00cfff',
  ok:    '#00e87a',
  api:   '#a78bfa',
  warn:  '#ffd23f',
  error: '#ff2d55',
  info:  '#8a9ab0',
}
const LOG_ICONS: Record<LogLevel, string> = {
  step: '→', ok: '✓', api: '◉', warn: '▲', error: '✕', info: 'ℹ',
}

const S = {
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
}

// ── RECENTバー ──
function RecentBar({ onSelect, disabled }: { onSelect:(code:string)=>void; disabled:boolean }) {
  const [recent, setRecent] = React.useState<Array<{code:string;name:string;B:number}>>([])
  React.useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('history_v7')||'[]')
      const seen = new Set<string>(); const items: typeof recent = []
      for (const e of h) {
        if (!seen.has(e.code) && items.length < 5) {
          seen.add(e.code)
          items.push({ code:e.code, name:e.name, B:e.totalScore||0 })
        }
      }
      setRecent(items)
    } catch {}
  }, [])
  if (!recent.length) return null
  return (
    <div style={{ marginBottom:10, padding:'7px 12px',
      backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
      borderRadius:6, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.1em' }}>
        RECENT · 最近分析
      </span>
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

// ── LOGパネル（V6仕様）──
function LogPanel({ logs, onClear }: { logs: LogEntry[]; onClear: ()=>void }) {
  const [show, setShow] = useState(true)
  const [filter, setFilter] = useState<LogLevel|'all'>('all')
  const [expanded, setExpanded] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [logs.length])

  if (!show) return null  // ✕で非表示

  const errCount  = logs.filter(l => l.level==='error').length
  const warnCount = logs.filter(l => l.level==='warn').length
  const filtered  = filter==='all' ? logs : logs.filter(l => l.level===filter)

  const M = 'IBM Plex Mono,monospace'
  const levels: Array<LogLevel|'all'> = ['all','step','ok','api','warn','error','info']

  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:9999,
      backgroundColor:'var(--bg2)', borderTop:'2px solid var(--c)',
      maxHeight: expanded ? '50vh' : '180px',
      display:'flex', flexDirection:'column',
      fontFamily:M, boxShadow:'0 -4px 24px rgba(0,0,0,0.6)',
      transition:'max-height 0.2s ease',
    }}>
      {/* ヘッダー */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 12px',
        borderBottom:'1px solid var(--bd)', flexWrap:'wrap', flexShrink:0 }}>
        <span style={{ fontSize:11, color:'var(--c)', fontWeight:700 }}>• LOG</span>
        <span style={{ fontSize:10, color:'var(--t2)' }}>{logs.length}件</span>
        {errCount > 0  && <span style={{ fontSize:9, color:'#ff2d55', padding:'1px 5px', border:'1px solid #ff2d55', borderRadius:3 }}>✕{errCount}</span>}
        {warnCount > 0 && <span style={{ fontSize:9, color:'#ffd23f', padding:'1px 5px', border:'1px solid #ffd23f', borderRadius:3 }}>▲{warnCount}</span>}
        {/* フィルタボタン */}
        <div style={{ display:'flex', gap:4, marginLeft:4 }}>
          {levels.map(lv => (
            <button key={lv} onClick={() => setFilter(lv)} style={{
              fontSize:9, padding:'2px 7px',
              border:`1px solid ${filter===lv ? (lv==='all'?'var(--c)':LOG_COLORS[lv as LogLevel]||'var(--c)') : 'var(--bd)'}`,
              color: filter===lv ? (lv==='all'?'var(--c)':LOG_COLORS[lv as LogLevel]||'var(--c)') : 'var(--t3)',
              backgroundColor:'transparent', cursor:'pointer', borderRadius:3,
              fontFamily:M,
            }}>{lv}</button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={() => setExpanded(v=>!v)} style={{ fontSize:9, color:'var(--t2)', cursor:'pointer', background:'none', border:'1px solid var(--bd)', padding:'2px 7px', borderRadius:3 }}>
            {expanded ? '縮小' : '展開'}
          </button>
          <button onClick={onClear} style={{ fontSize:9, color:'var(--t3)', cursor:'pointer', background:'none', border:'1px solid var(--bd)', padding:'2px 7px', borderRadius:3 }}>
            清空
          </button>
          <button onClick={() => setShow(false)} style={{ fontSize:11, color:'var(--t3)', cursor:'pointer', background:'none', border:'none', padding:'0 4px' }}>✕</button>
        </div>
      </div>

      {/* ログリスト */}
      <div ref={listRef} style={{ overflowY:'auto', flex:1, padding:'4px 0' }}>
        {filtered.length === 0 && (
          <div style={{ padding:'8px 14px', color:'var(--t3)', fontSize:10 }}>ログなし</div>
        )}
        {filtered.map(l => (
          <div key={l.id} style={{
            display:'flex', gap:8, padding:'3px 12px', alignItems:'flex-start',
            borderBottom:'1px solid rgba(0,207,255,0.04)',
            backgroundColor: l.level==='error' ? 'rgba(255,45,85,0.05)' : 'transparent',
          }}>
            <span style={{ fontSize:9, color:'var(--t3)', flexShrink:0, marginTop:1 }}>{l.ts}</span>
            <span style={{ fontSize:9, color:'var(--t3)', width:52, flexShrink:0, marginTop:1 }}>{l.tag}</span>
            <span style={{ fontSize:10, color:LOG_COLORS[l.level], flexShrink:0 }}>
              {LOG_ICONS[l.level]} {l.level}
            </span>
            <span style={{ fontSize:11, color:'var(--t)', flex:1 }}>{l.msg}</span>
            {l.detail && (
              <span style={{ fontSize:9, color:'var(--t3)', flexShrink:0, maxWidth:400,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {l.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function TabAnalyze() {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<AnalysisResult | null>(null)
  const [error, setError]     = useState('')
  const [progress, setProgress] = useState('')
  const [logs, setLogs]       = useState<LogEntry[]>([])
  const startTimeRef = useRef<number>(0)

  const addLog = useCallback((msg: string, level: LogLevel = 'info', detail = '', tag = 'analyze') => {
    const now = new Date()
    const elapsed = startTimeRef.current ? `+${((Date.now()-startTimeRef.current)/1000).toFixed(1)}s` : ''
    const ts = now.toTimeString().slice(0,8) + (elapsed ? ` ${elapsed}` : '')
    setLogs(prev => [...prev.slice(-200), { id: ++logIdSeq, ts, level, msg, detail, tag }])
  }, [])

  async function run(targetCode?: string, isForce = false) {
    const c = (targetCode ?? code).trim()
    if (!/^\d{6}$/.test(c)) { setError('请输入正确的6位股票代码'); return }
    const apiKey = localStorage.getItem('qtkey') || ''
    if (!apiKey) { setError('请先在顶部输入并保存 Anthropic API Key'); return }

    setLoading(true); setError(''); setResult(null)
    startTimeRef.current = Date.now()
    addLog(`开始分析 ${c}`, 'step', `code=${c}`, 'analyze')
    setProgress('① 获取实时行情 + K线均线…')

    try {
      addLog('调用 /api/analyze', 'api', 'POST body: {code, apiKey}', 'analyze')
      const t0 = Date.now()
      const res = await fetch('/api/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ code: c, apiKey, force: isForce }),
      })
      const elapsed = ((Date.now()-t0)/1000).toFixed(1)
      addLog(`HTTP ${res.status} (${elapsed}s)`, res.ok ? 'api' : 'error', '', 'analyze')

      setProgress('② 解析AI分析结果…')
      const json = await res.json()

      if (!json.ok) throw new Error(json.error)
      const data = json.data as AnalysisResult & { _debug?: Record<string, unknown> }

      // デバッグ情報をログに出力
      if (data._debug) {
        const d = data._debug
        if (data._cached) {
        addLog('使用缓存数据（同日同价格）', 'info', `缓存时间: ${data._cachedAt||'—'}`, 'analyze')
      }
      addLog(`MA取得: ${d.maFetchLog}`, d.maFetchLog?.toString().includes('失敗') ? 'warn' : 'ok', '', 'analyze')
        addLog(`行情: 価格=${d.quotePrice} 出来高=${d.quoteVolume} 換手率=${d.quoteTurnoverPct}%`, 'info', `成交額=${d.quoteAmount}`, 'analyze')
      }

      setResult(data)
      addLog(
        `${data.name} 分析完成`,
        'ok',
        `B分=${data.totalScore} 信号=${data.signal} MA5=${data.ma5||'—'} 乖离=${data.ma20Bias?.toFixed(1)||'—'}% 止損=¥${data.stopLoss}`,
        'analyze'
      )

      // localStorage保存
      try {
        const existing = JSON.parse(localStorage.getItem('history_v7')||'[]')
        localStorage.setItem('history_v7', JSON.stringify([{
          id:Date.now(), code:data.code, name:data.name,
          price:data.price, changePct:data.changePct,
          totalScore:data.totalScore, signal:data.signal,
          stopLoss:data.stopLoss, targetPrice:data.targetPrice,
          riskRatio:data.riskRatio, summary:data.summary,
          scoresJson:JSON.stringify(data.scores??[]),
          createdAt:new Date().toISOString(),
        },...existing].slice(0,100)))
        addLog('历史记录已保存', 'info', '', 'analyze')
      } catch (e) {
        addLog('历史记录保存失败', 'warn', String(e), 'analyze')
      }

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '分析失败，请重试'
      setError(msg)
      addLog(msg, 'error', e instanceof Error ? (e.stack||'') : '', 'analyze')
    } finally {
      const total = ((Date.now()-startTimeRef.current)/1000).toFixed(1)
      addLog(`完了 総時間${total}s`, 'step', '', 'analyze')
      setLoading(false); setProgress('')
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, paddingBottom:200 }}>
      <Card title="SINGLE STOCK ANALYSIS · 单股八维度分析">
        <RecentBar onSelect={c => { setCode(c); run(c) }} disabled={loading}/>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const, marginBottom:10 }}>
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
            <button onClick={() => { setResult(null); run(undefined, true) }} disabled={loading} style={S.refreshBtn}>
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
          <div style={S.err}><span>✕</span><span>{error}</span></div>
        )}
      </Card>

      {/* ローディング - V6仕様のステップ表示 */}
      {loading && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 0', gap:12 }}>
          <div style={{ position:'relative', width:52, height:52 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid var(--bd)' }}/>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid transparent',
              borderTopColor:'var(--c)', animation:'spin 0.7s linear infinite' }}/>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--c)', fontFamily:'IBM Plex Mono', fontSize:9 }}>AI</div>
          </div>
          <div style={{ color:'var(--c)', fontFamily:'IBM Plex Mono', fontSize:11 }}>{progress}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'center' }}>
            {[
              { id:'st0', text:'① 东方财富实时接口 → 价格/均线/成交量' },
              { id:'st1', text:'② Claude AI → 八维度评分 + 乖离率计算' },
              { id:'st2', text:'③ 生成B分 · 操作建议 · 盈亏比' },
            ].map(st => (
              <div key={st.id} style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t3)' }}>
                {st.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空の状態 */}
      {!result && !loading && (
        <div style={S.empty}>
          <div style={{ width:48, height:48, border:'1px solid var(--bd)', borderRadius:12,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:18 }}>8D</div>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:13 }}>
            输入股票代码，开始八维度分析
          </span>
          <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:10, opacity:0.6 }}>
            ①趋势 ②量能 ③Alpha ④威科夫 ⑤板块 ⑥资金 ⑦基本面 ⑧乖离率控制
          </span>
        </div>
      )}

      {/* 分析結果 */}
      {result && !loading && <AnalysisResultCard result={result}/>}

      {/* LOGパネル（常時表示） */}
      <LogPanel logs={logs} onClear={() => setLogs([])}/>
    </div>
  )
}
