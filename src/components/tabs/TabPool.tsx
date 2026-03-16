'use client'

import React from 'react'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/shared/Card'
import { addLog } from '@/lib/logger'
import {
  enrichPoolStock, sortPool, filterPool, calcPoolSummary,
  type PoolStockRaw, type PoolStockView, type StockTier,
} from '@/lib/core/pool-sort'
import { fmtPct } from '@/lib/core/format'

const TIER_LABEL: Record<StockTier | 'all', string> = {
  all: '全部', core: '核心进攻', steady: '稳健跟随', defense: '防御补充', watch: '观察候补',
}

const DEFAULT_POOL: PoolStockRaw[] = [
  { code:'000048',name:'京基智农', tier:'core',    cost:20.99,addDate:'2026/03/13',price:20.99,chg:3.86, d3:0,d6:18.65,m1:16.48,mon:0,volr:1 },
  { code:'600886',name:'国投电力', tier:'core',    cost:15.05,addDate:'2026/03/13',price:15.05,chg:0.27, d3:0,d6:9.61, m1:15.15,mon:0,volr:1 },
  { code:'600509',name:'天富能源', tier:'core',    cost:9.82, addDate:'2026/03/13',price:9.82, chg:1.66, d3:0,d6:9.11, m1:17.46,mon:0,volr:1 },
  { code:'000933',name:'神火股份', tier:'core',    cost:39.40,addDate:'2026/03/13',price:39.40,chg:3.58, d3:0,d6:8.60, m1:24.96,mon:0,volr:1 },
  { code:'601101',name:'昊华能源', tier:'core',    cost:9.23, addDate:'2026/03/13',price:9.23, chg:4.89, d3:0,d6:7.70, m1:19.25,mon:0,volr:1 },
  { code:'601225',name:'陕西煤业', tier:'core',    cost:27.00,addDate:'2026/03/13',price:27.00,chg:1.12, d3:0,d6:7.19, m1:22.56,mon:0,volr:1 },
  { code:'603606',name:'东方电缆', tier:'core',    cost:68.61,addDate:'2026/03/13',price:68.61,chg:3.42, d3:0,d6:12.11,m1:23.18,mon:0,volr:1 },
  { code:'600233',name:'圆通速递', tier:'steady',  cost:20.80,addDate:'2026/03/13',price:20.80,chg:5.53, d3:0,d6:9.53, m1:14.73,mon:0,volr:1 },
  { code:'600096',name:'云天化',   tier:'core',    cost:44.92,addDate:'2026/03/13',price:44.92,chg:6.32, d3:0,d6:10.37,m1:27.98,mon:0,volr:1 },
  { code:'600486',name:'扬农化工', tier:'steady',  cost:86.88,addDate:'2026/03/13',price:86.88,chg:1.86, d3:0,d6:8.60, m1:22.30,mon:0,volr:1 },
  { code:'000807',name:'云铝股份', tier:'steady',  cost:36.40,addDate:'2026/03/13',price:36.40,chg:3.29, d3:0,d6:2.65, m1:15.59,mon:0,volr:1 },
  { code:'600598',name:'北大荒',   tier:'steady',  cost:17.72,addDate:'2026/03/13',price:17.72,chg:0.57, d3:0,d6:7.46, m1:14.77,mon:0,volr:1 },
  { code:'000922',name:'佳电股份', tier:'steady',  cost:16.03,addDate:'2026/03/13',price:16.03,chg:2.76, d3:0,d6:6.16, m1:14.66,mon:0,volr:1 },
  { code:'600458',name:'时代新材', tier:'steady',  cost:15.23,addDate:'2026/03/13',price:15.23,chg:3.32, d3:0,d6:7.71, m1:8.94, mon:0,volr:1 },
  { code:'000885',name:'城发环境', tier:'defense', cost:14.61,addDate:'2026/03/13',price:14.61,chg:0.76, d3:0,d6:6.25, m1:6.41, mon:0,volr:1 },
  { code:'600017',name:'日照港',   tier:'defense', cost:3.31, addDate:'2026/03/13',price:3.31, chg:0.30, d3:0,d6:6.09, m1:5.08, mon:0,volr:1 },
  { code:'002004',name:'华邦健康', tier:'defense', cost:5.71, addDate:'2026/03/13',price:5.71, chg:1.78, d3:0,d6:6.73, m1:4.96, mon:0,volr:1 },
  { code:'600820',name:'隧道股份', tier:'defense', cost:6.72, addDate:'2026/03/13',price:6.72, chg:0.75, d3:0,d6:5.33, m1:0.75, mon:0,volr:1 },
  { code:'600988',name:'赤峰黄金', tier:'defense', cost:42.44,addDate:'2026/03/13',price:42.44,chg:0.21, d3:0,d6:5.21, m1:15.23,mon:0,volr:1 },
  { code:'002429',name:'兆驰股份', tier:'watch',   cost:11.71,addDate:'2026/03/13',price:11.71,chg:7.93, d3:0,d6:14.58,m1:23.78,mon:0,volr:1 },
]

const POOL_KEY = 'pool_v7'

// ─── スタイル定数 ───
const C = {
  btn: (color: string, bg: string) => ({
    display:'inline-flex' as const, alignItems:'center' as const, gap:5,
    fontFamily:'IBM Plex Mono', fontSize:11,
    padding:'6px 14px',
    backgroundColor: bg,
    border:`1px solid ${color}`,
    color, borderRadius:6, cursor:'pointer' as const,
    transition:'all .15s',
  }),
  filterBtn: (active: boolean) => ({
    fontFamily:'IBM Plex Mono', fontSize:10,
    padding:'4px 12px',
    border:`1px solid ${active ? 'var(--c)' : 'var(--bd)'}`,
    borderRadius:99,
    color: active ? 'var(--c)' : 'var(--t2)',
    backgroundColor: active ? 'rgba(56,200,255,0.10)' : 'transparent',
    cursor:'pointer' as const,
    transition:'all .15s',
  }),
  tag: (color: string) => ({
    fontFamily:'IBM Plex Mono', fontSize:9,
    padding:'1px 6px',
    border:`1px solid ${color}`,
    borderRadius:3, color,
    backgroundColor:`${color}18`,
  }),
}

export function TabPool() {
  const [rawStocks, setRawStocks] = useState<PoolStockRaw[]>([])
  const [tierFilter, setTierFilter] = useState<StockTier | 'all'>('all')
  const [loading, setLoading]      = useState(false)
  const [ma20Loading, setMa20Loading] = useState(false)
  const [statusMsg, setStatusMsg]  = useState('')
  const [statusOk, setStatusOk]    = useState(true)
  const [showAdd, setShowAdd]      = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(POOL_KEY)
    if (saved) {
      try { setRawStocks(JSON.parse(saved)) } catch { setRawStocks(DEFAULT_POOL) }
    } else {
      setRawStocks(DEFAULT_POOL)
      localStorage.setItem(POOL_KEY, JSON.stringify(DEFAULT_POOL))
    }
  }, [])

  const save = useCallback((stocks: PoolStockRaw[]) => {
    setRawStocks(stocks)
    localStorage.setItem(POOL_KEY, JSON.stringify(stocks))
  }, [])

  const enriched = rawStocks.map(enrichPoolStock)
  const filtered  = filterPool(enriched, tierFilter)
  const sorted    = sortPool(filtered)
  const summary   = calcPoolSummary(enriched)

  async function refreshAll() {
    setLoading(true)
    setStatusMsg('⟳ 正在获取实时行情…')
    try {
      const res  = await fetch('/api/quote', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ codes: rawStocks.map(s => s.code) }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      const map = new Map(json.data.map((q: Record<string,unknown>) => [q.code, q]))
      const updated = rawStocks.map(s => {
        const q = map.get(s.code) as Record<string,number> | undefined
        if (!q) return s
        return { ...s, price:q.price, chg:q.changePct, d3:q.rise3d??0,
                 d6:q.rise6d, m1:q.rise1m, mon:q.riseMon, d90:(q.rise3m !== 0 ? q.rise3m : undefined), volr:q.volRatio, dataMode:'realtime' }
      })
      save(updated)
      setStatusOk(true)
      setStatusMsg(`✓ 行情更新完成 · ${updated.length}只`)
      addLog(`自选股池行情更新完成`, 'ok', `${updated.length}只`, 'pool')
    } catch (e: unknown) {
      setStatusOk(false)
      const msg = e instanceof Error ? e.message : '更新失败'
      setStatusMsg(`✕ ${msg}`)
      addLog(msg, 'error', '', 'pool')
    } finally { setLoading(false) }
  }

  async function calcMA20All() {
    setMa20Loading(true)
    setStatusMsg(`⟳ 正在计算MA20乖离率（${rawStocks.length}只）…`)
    try {
      const res  = await fetch('/api/ma20', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ codes: rawStocks.map(s => s.code) }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      const map = new Map(json.data.map((item: Record<string,unknown>) => [item.code, item]))
      const updated = rawStocks.map(s => {
        const m = map.get(s.code) as Record<string,number> | undefined
        if (!m || m.error) return s
        return { ...s, ma20Bias: m.bias, ma20: m.ma20 }
      })
      save(updated)
      setStatusOk(true)
      setStatusMsg('✓ MA20乖离计算完成 · B分已用真实乖离更新')
      addLog('MA20乖离率计算完成', 'ok', `${rawStocks.length}只`, 'pool')
    } catch (e: unknown) {
      setStatusOk(false)
      const msg = e instanceof Error ? e.message : '计算失败'
      setStatusMsg(`✕ ${msg}`)
      addLog(msg, 'error', '', 'pool')
    } finally { setMa20Loading(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* 統計カード */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'股票池总数',     value:`${summary.total}只`,          color:'var(--c)' },
          { label:'强力信号(≥4.5)', value:`${summary.strongCount}只`,    color:'var(--g)' },
          { label:'需关注(<3.5)',   value:`${summary.dangerCount}只`,    color:'var(--r)' },
          { label:'平均B分',        value:summary.avgB.toFixed(2),       color:'var(--y)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
            borderRadius:10, padding:'12px', textAlign:'center',
          }}>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.08em', marginBottom:6 }}>
              {label}
            </div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:22, fontWeight:700, color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* メインカード */}
      <Card title="WATCHLIST · 自选股池管理（最多30只）"
        action={
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={refreshAll} disabled={loading}
              style={C.btn('var(--c)','rgba(56,200,255,0.08)')}>
              {loading ? '⟳ 更新中…' : '↻ 实时更新'}
            </button>
            <button onClick={calcMA20All} disabled={ma20Loading}
              style={C.btn('var(--g)','rgba(0,232,122,0.06)')}>
              {ma20Loading ? '⟳ 计算中…' : '📐 MA20乖离'}
            </button>
            <button style={C.btn('var(--y)','rgba(247,201,72,0.06)')}>
              📅 月度轮换
            </button>
            <button onClick={() => setShowAdd(true)}
              style={C.btn('var(--p)','rgba(200,122,255,0.06)')}>
              + 添加股票
            </button>
          </div>
        }
      >
        {/* ステータスバー */}
        {statusMsg && (
          <div style={{
            marginBottom:12, padding:'6px 12px',
            backgroundColor: statusOk ? 'rgba(56,200,255,0.05)' : 'rgba(255,58,110,0.05)',
            border:`1px solid ${statusOk ? 'rgba(56,200,255,0.2)' : 'rgba(255,58,110,0.2)'}`,
            borderRadius:6, fontFamily:'IBM Plex Mono', fontSize:10,
            color: statusOk ? 'var(--c)' : 'var(--r)',
          }}>
            {statusMsg}
          </div>
        )}

        {/* ティアフィルター */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          {(Object.entries(TIER_LABEL) as [StockTier|'all', string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTierFilter(key)}
              style={C.filterBtn(tierFilter === key)}>
              {label}
              {key !== 'all' && ` (${summary.byTier[key] ?? 0})`}
            </button>
          ))}
        </div>

        {/* テーブル */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'IBM Plex Mono', fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--bd)' }}>
                {['#','股票','定位','B分','今日%','6日%','近一月%','90日%','⑧乖离','止损','目标','操作'].map((h: string) => (
                  <th key={h} style={{
                    textAlign:'left', fontSize:9, color:'var(--t2)',
                    paddingBottom:8, paddingRight:10, fontWeight:500, letterSpacing:'0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => <PoolRow key={s.code} stock={s} rank={i+1} onRemove={(code) => {
                    setRawStocks(prev => {
                      const next = prev.filter(x => x.code !== code)
                      localStorage.setItem(POOL_KEY, JSON.stringify(next))
                      return next
                    })
                  }} />)}
              {sorted.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign:'center', padding:'40px 0', color:'var(--t3)' }}>
                  暂无股票
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* フッター統計 */}
        <div style={{
          marginTop:12, paddingTop:12, borderTop:'1px solid var(--bd)',
          fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t3)',
        }}>
          共{summary.total}只 · 核心进攻{summary.byTier.core}
          /稳健跟随{summary.byTier.steady}
          /防御补充{summary.byTier.defense}
          /观察候补{summary.byTier.watch}
          · 平均B分{summary.avgB}
        </div>
      </Card>

      {/* 追加モーダル */}
      {showAdd && (
        <AddStockModal
          onAdd={(stock) => {
            setRawStocks(prev => {
              if (prev.find(s => s.code === stock.code)) {
                alert(`${stock.code} は既に股票池に存在します`)
                return prev
              }
              if (prev.length >= 30) {
                alert('股票池は最大30只です')
                return prev
              }
              const next = [...prev, stock]
              localStorage.setItem(POOL_KEY, JSON.stringify(next))
              return next
            })
            setShowAdd(false)
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function PoolRow({ stock: s, rank, onRemove }: { stock: PoolStockView; rank: number; onRemove: (code: string) => void }) {
  const { biasLevel, signal, biasIsReal } = s
  const biasVal = s.ma20Bias ?? s.m1 ?? 0

  function pctColor(v: number) {
    return v > 0 ? 'var(--r)' : v < 0 ? 'var(--g)' : 'var(--t3)'
  }

  return (
    <tr style={{ borderBottom:'1px solid rgba(56,200,255,0.05)', transition:'background .1s' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor='rgba(56,200,255,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor='transparent')}
    >
      <td style={{ padding:'9px 10px 9px 0', color:'var(--t2)', fontFamily:'IBM Plex Mono', fontSize:11 }}>{rank}</td>
      <td style={{ padding:'9px 10px 9px 0' }}>
        <div style={{ fontWeight:700, color:'var(--t)' }}>{s.name}</div>
        <div style={{ fontSize:9, color:'var(--c)', fontFamily:'IBM Plex Mono', marginTop:1, letterSpacing:'0.05em' }}>{s.code}</div>
      </td>
      <td style={{ padding:'9px 10px 9px 0' }}>
        <span style={{
          fontSize:9, padding:'2px 6px',
          border:'1px solid var(--bd)', borderRadius:3,
          color:'var(--t3)',
        }}>
          {s.tier==='core'?'核心':s.tier==='steady'?'稳健':s.tier==='defense'?'防御':'观察'}
        </span>
      </td>
      <td style={{ padding:'9px 10px 9px 0' }}>
        <span style={{ color:signal.color, fontWeight:700 }}>{signal.label}</span>
      </td>
      <td style={{ padding:'9px 10px 9px 0', color:pctColor(s.chg) }}>{fmtPct(s.chg)}</td>
      <td style={{ padding:'9px 10px 9px 0', color:pctColor(s.d6)  }}>{fmtPct(s.d6)}</td>
      <td style={{ padding:'9px 10px 9px 0', color:pctColor(s.m1)  }}>{fmtPct(s.m1)}</td>
      <td style={{ padding:'9px 10px 9px 0', color:pctColor(s.d90 ?? 0), fontFamily:'IBM Plex Mono' }}>
        {s.d90 ? fmtPct(s.d90) : '—'}
      </td>
      <td style={{ padding:'9px 10px 9px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
          <span title={biasLevel.action} style={C.tag(biasLevel.color)}>{biasLevel.label}</span>
          <span style={{
            fontFamily:'IBM Plex Mono', fontSize:8,
            padding:'0 4px', borderRadius:2,
            border: biasIsReal ? '1px solid rgba(0,232,122,0.3)' : '1px solid var(--bd)',
            color: biasIsReal ? 'var(--g)' : 'var(--t3)',
          }} title={biasIsReal ? `真实MA20: ${biasVal.toFixed(1)}%` : '近一月涨幅估算'}>
            {biasIsReal ? 'MA20' : 'm1估'}
          </span>
        </div>
      </td>
      <td style={{ padding:'9px 10px 9px 0', color:'var(--r)', fontFamily:'IBM Plex Mono' }}>
        {s.stopLoss.toFixed(2)}
      </td>
      <td style={{ padding:'9px 10px 9px 0', color:'var(--g)', fontFamily:'IBM Plex Mono' }}>
        {s.targetPrice.toFixed(2)}
      </td>
      <td style={{ padding:'9px 6px 9px 0' }}>
        <button
          onClick={() => {
            if (!confirm(`确认从股票池中移除 ${s.name}（${s.code}）？`)) return
            onRemove(s.code)
          }}
          style={{
            fontSize:9, padding:'3px 8px',
            border:'1px solid rgba(255,58,110,0.3)', borderRadius:4,
            color:'var(--r)', backgroundColor:'transparent', cursor:'pointer',
            transition:'all .15s',
          }}>移除</button>
      </td>
    </tr>
  )
}


// ── 株追加モーダル ──
function AddStockModal({
  onAdd, onClose,
}: {
  onAdd:  (stock: PoolStockRaw) => void
  onClose: () => void
}) {
  const [code,    setCode]    = useState('')
  const [name,    setName]    = useState('')
  const [tier,    setTier]    = useState<StockTier>('core')
  const [cost,    setCost]    = useState('')
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  // コードを入力したら名称を自動取得
  async function fetchName(code: string) {
    if (!/^\d{6}$/.test(code)) return
    setLoading(true)
    try {
      const res  = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: [code] }),
      })
      const json = await res.json()
      if (json.ok && json.data[0]?.name) {
        setName(json.data[0].name)
      }
    } catch { /* 取得失敗は無視 */ } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    if (!/^\d{6}$/.test(code)) { setErr('请输入正确的6位股票代码'); return }
    if (!name.trim()) { setErr('请输入股票名称'); return }

    const today = new Date()
    const cst   = new Date(today.getTime() + 8 * 3600000)
    const addDate = `${cst.getUTCFullYear()}/${String(cst.getUTCMonth()+1).padStart(2,'0')}/${String(cst.getUTCDate()).padStart(2,'0')}`

    onAdd({
      code, name: name.trim(), tier,
      cost:    parseFloat(cost) || 0,
      addDate,
      price: 0, chg: 0, d3: 0, d6: 0, m1: 0, mon: 0, volr: 1,
    })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
    color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:12,
    padding:'7px 10px', borderRadius:6, outline:'none', width:'100%',
  }
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor:'pointer',
  }

  return (
    <div style={{
      position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.82)',
      zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      <div style={{
        backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
        borderRadius:12, width:'100%', maxWidth:480, padding:24, position:'relative',
      }}>
        <button onClick={onClose} style={{
          position:'absolute', top:14, right:16, background:'transparent',
          border:'1px solid var(--bd)', color:'var(--t2)',
          borderRadius:4, cursor:'pointer', width:28, height:28, fontSize:13,
        }}>✕</button>

        <div style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--p)', letterSpacing:'0.12em', marginBottom:16 }}>
          + 添加股票到股票池
        </div>

        {err && (
          <div style={{
            padding:'6px 12px', marginBottom:10, borderRadius:5,
            backgroundColor:'rgba(255,58,110,0.08)', border:'1px solid rgba(255,58,110,0.3)',
            color:'var(--r)', fontFamily:'IBM Plex Mono', fontSize:10,
          }}>✕ {err}</div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>
              股票代码 *
            </div>
            <input style={inputStyle} placeholder="000815" maxLength={6}
              value={code}
              onChange={e => {
                const v = e.target.value.replace(/\D/g,'').slice(0,6)
                setCode(v); setErr('')
                if (v.length === 6) fetchName(v)
              }} />
          </div>

          <div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>
              股票名称 * {loading && <span style={{ color:'var(--c)' }}>⟳ 自动获取中…</span>}
            </div>
            <input style={inputStyle} placeholder="美利云"
              value={name} onChange={e => { setName(e.target.value); setErr('') }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>定位</div>
              <select style={selectStyle} value={tier}
                onChange={e => setTier(e.target.value as StockTier)}>
                <option value="core">核心进攻</option>
                <option value="steady">稳健跟随</option>
                <option value="defense">防御补充</option>
                <option value="watch">观察候补</option>
              </select>
            </div>
            <div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>成本价（可选）</div>
              <input style={inputStyle} placeholder="0.00" type="number" step="0.01"
                value={cost} onChange={e => setCost(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={onClose} style={{
            fontFamily:'IBM Plex Mono', fontSize:11, padding:'7px 18px',
            border:'1px solid var(--bd)', borderRadius:5,
            color:'var(--t2)', backgroundColor:'transparent', cursor:'pointer',
          }}>取消</button>
          <button onClick={handleAdd} style={{
            fontFamily:'IBM Plex Mono', fontSize:11, fontWeight:700, padding:'7px 22px',
            border:'none', borderRadius:5, cursor:'pointer',
            backgroundColor:'var(--p)', color:'#000',
          }}>确认添加</button>
        </div>
      </div>
    </div>
  )
}
