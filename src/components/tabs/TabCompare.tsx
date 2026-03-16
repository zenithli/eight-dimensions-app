'use client'

import { useState } from 'react'
import { Card } from '@/components/shared/Card'
import { getBSignal } from '@/lib/core/b-score'

interface CompareResult {
  code:       string
  name:       string
  price:      number
  changePct:  number
  totalScore: number
  signal:     string
  stopLoss:   number
  targetPrice: number
  riskRatio:  string
  scores:     Array<{ dim:number; name:string; score:number }>
  error?:     string
}

const MAX_CODES = 5

export function TabCompare() {
  const [codes, setCodes]       = useState<string[]>(['', ''])
  const [running, setRunning]   = useState(false)
  const [results, setResults]   = useState<CompareResult[]>([])
  const [progress, setProgress] = useState('')
  const [error, setError]       = useState('')

  function setCode(i: number, val: string) {
    const next = [...codes]
    next[i] = val.replace(/\D/g,'').slice(0,6)
    setCodes(next)
  }

  function addCode() {
    if (codes.length < MAX_CODES) setCodes([...codes, ''])
  }

  function removeCode(i: number) {
    if (codes.length <= 2) return
    setCodes(codes.filter((_,idx) => idx !== i))
  }

  async function runCompare() {
    const targets = codes.filter(c => /^\d{6}$/.test(c))
    if (targets.length < 2) { setError('至少输入2个有效的6位股票代码'); return }

    const apiKey = localStorage.getItem('qtkey') || ''
    if (!apiKey) { setError('请先在顶部保存 API Key'); return }

    setRunning(true); setError(''); setResults([])

    const done: CompareResult[] = []
    for (let i = 0; i < targets.length; i++) {
      const code = targets[i]
      setProgress(`正在分析 ${code}… (${i+1}/${targets.length})`)
      try {
        const res  = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, apiKey }),
        })
        const json = await res.json()
        if (json.ok) done.push(json.data)
        else done.push({ code, name:code, price:0, changePct:0, totalScore:0,
                         signal:'—', stopLoss:0, targetPrice:0, riskRatio:'—',
                         scores:[], error: json.error })
      } catch (e: unknown) {
        done.push({ code, name:code, price:0, changePct:0, totalScore:0,
                   signal:'—', stopLoss:0, targetPrice:0, riskRatio:'—',
                   scores:[], error: e instanceof Error ? e.message : '分析失败' })
      }
    }

    setResults(done.sort((a,b) => b.totalScore - a.totalScore))
    setProgress('')
    setRunning(false)
  }

  const DIM_NAMES = ['趋势共振','量能加速','Alpha超额','威科夫阶段','板块生态','资金流向','基本面锚']

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Card title="COMPARE · 多股AI对比分析">

        {/* コード入力エリア */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end', marginBottom:14 }}>
          {codes.map((code, i) => (
            <div key={i} style={{ position:'relative' }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t)', marginBottom:3 }}>
                股票 {i+1}
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <input
                  value={code}
                  onChange={e => setCode(i, e.target.value)}
                  placeholder={['000815','601225','159326','600886','601101'][i] || '000000'}
                  maxLength={6}
                  disabled={running}
                  style={{
                    width:90, backgroundColor:'var(--bg3)',
                    border:`1px solid ${/^\d{6}$/.test(code) ? 'var(--c)' : 'var(--bd)'}`,
                    color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:13,
                    padding:'7px 10px', borderRadius:6, outline:'none',
                  }}
                />
                {codes.length > 2 && (
                  <button onClick={() => removeCode(i)} style={{
                    width:28, border:'1px solid var(--bd)', borderRadius:5,
                    color:'var(--r)', backgroundColor:'transparent', cursor:'pointer', fontSize:12,
                  }}>✕</button>
                )}
              </div>
            </div>
          ))}

          {codes.length < MAX_CODES && (
            <button onClick={addCode} disabled={running} style={{
              fontFamily:'IBM Plex Mono', fontSize:10, padding:'7px 12px',
              border:'1px dashed var(--bd)', borderRadius:6,
              color:'var(--t)', backgroundColor:'transparent', cursor:'pointer',
              alignSelf:'flex-end',
            }}>
              + 添加
            </button>
          )}

          <button onClick={runCompare} disabled={running} style={{
            display:'inline-flex', alignItems:'center', gap:6,
            fontFamily:'IBM Plex Mono', fontSize:11, padding:'8px 20px',
            backgroundColor:'rgba(56,200,255,0.1)', border:'1px solid rgba(56,200,255,0.4)',
            color:'var(--c)', borderRadius:6, cursor: running ? 'not-allowed' : 'pointer',
            opacity: running ? 0.6 : 1, alignSelf:'flex-end',
          }}>
            {running ? '⟳ 分析中…' : '🔍 开始对比分析'}
          </button>
        </div>

        {error && (
          <div style={{
            padding:'6px 12px', marginBottom:10, borderRadius:5,
            backgroundColor:'rgba(255,58,110,0.08)',
            border:'1px solid rgba(255,58,110,0.3)',
            color:'var(--r)', fontFamily:'IBM Plex Mono', fontSize:10,
          }}>✕ {error}</div>
        )}

        {/* ローディング */}
        {running && (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:28, marginBottom:12 }}>⚖️</div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--c)' }}>{progress}</div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t)', marginTop:6 }}>
              每只股票约15–30秒，请耐心等待
            </div>
          </div>
        )}

        {/* 空状態 */}
        {!running && results.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>⚖️</div>
            <div style={{ color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:12 }}>
              输入2–5只股票代码，AI同时分析并横向对比
            </div>
            <div style={{ color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:10, marginTop:6, opacity:0.7 }}>
              对比维度：八维度B分 / 止损 / 目标价 / 盈亏比
            </div>
          </div>
        )}

        {/* 結果テーブル */}
        {!running && results.length > 0 && (
          <>
            {/* ランキングカード */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:16 }}>
              {results.map((r, rank) => {
                const sig = getBSignal(r.totalScore)
                return (
                  <div key={r.code} style={{
                    backgroundColor:'var(--bg3)',
                    border:`2px solid ${rank === 0 ? sig.color : 'var(--bd)'}`,
                    borderRadius:8, padding:'12px', textAlign:'center',
                    position:'relative',
                  }}>
                    {rank === 0 && (
                      <div style={{
                        position:'absolute', top:-8, left:'50%',
                        transform:'translateX(-50%)',
                        fontFamily:'IBM Plex Mono', fontSize:9,
                        padding:'1px 8px', borderRadius:99, backgroundColor:'var(--bg)',
                        border:`1px solid ${sig.color}`, color:sig.color,
                      }}>
                        No.1 推荐
                      </div>
                    )}
                    <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t)', marginBottom:2 }}>
                      #{rank+1} · {r.code}
                    </div>
                    <div style={{ fontWeight:700, color:'var(--t)', fontSize:14, marginBottom:6 }}>{r.name}</div>
                    <div style={{ fontFamily:'IBM Plex Mono', fontSize:32, fontWeight:900, color:sig.color, lineHeight:1 }}>
                      {r.totalScore.toFixed(2)}
                    </div>
                    <div style={{
                      fontFamily:'IBM Plex Mono', fontSize:10,
                      color:sig.color, marginTop:4,
                    }}>
                      {r.signal}
                    </div>
                    {r.error && (
                      <div style={{ fontSize:9, color:'var(--r)', marginTop:4 }}>⚠ {r.error}</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 詳細比較テーブル */}
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'IBM Plex Mono', fontSize:11 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--bd)' }}>
                    <th style={{ textAlign:'left', fontSize:9, color:'var(--t)', paddingBottom:8, paddingRight:12, fontWeight:400 }}>维度</th>
                    {results.map(r => (
                      <th key={r.code} style={{ textAlign:'center', fontSize:9, color:'var(--t)', paddingBottom:8, paddingRight:8, fontWeight:400 }}>
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* 基本情報 */}
                  {[
                    { label:'价格',    vals: results.map(r => r.error ? '—' : `¥${r.price.toFixed(2)}`), highlight:false },
                    { label:'B分',     vals: results.map(r => r.totalScore.toFixed(2)), highlight:true },
                    { label:'止损',    vals: results.map(r => r.error ? '—' : `¥${r.stopLoss.toFixed(2)}`), highlight:false },
                    { label:'目标价',  vals: results.map(r => r.error ? '—' : `¥${r.targetPrice.toFixed(2)}`), highlight:false },
                    { label:'盈亏比',  vals: results.map(r => r.riskRatio || '—'), highlight:false },
                  ].map(({ label, vals, highlight }) => {
                    const maxVal = highlight ? Math.max(...vals.map(v => parseFloat(v) || 0)) : null
                    return (
                      <tr key={label} style={{ borderBottom:'1px solid rgba(56,200,255,0.04)' }}>
                        <td style={{ padding:'7px 12px 7px 0', color:'var(--t2)', fontSize:10 }}>{label}</td>
                        {vals.map((v, i) => {
                          const isMax = highlight && parseFloat(v) === maxVal
                          return (
                            <td key={i} style={{
                              padding:'7px 8px', textAlign:'center',
                              color: isMax ? 'var(--g)' : 'var(--t2)',
                              fontWeight: isMax ? 700 : 400,
                            }}>
                              {v}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}

                  {/* 八维度スコア */}
                  {DIM_NAMES.map((name, dimIdx) => {
                    const dimScores = results.map(r => r.scores?.[dimIdx]?.score ?? 0)
                    const maxScore  = Math.max(...dimScores)
                    return (
                      <tr key={name} style={{ borderBottom:'1px solid rgba(56,200,255,0.04)' }}>
                        <td style={{ padding:'7px 12px 7px 0', color:'var(--t2)', fontSize:9 }}>
                          {['①','②','③','④','⑤','⑥','⑦'][dimIdx]} {name}
                        </td>
                        {dimScores.map((s, i) => (
                          <td key={i} style={{
                            padding:'7px 8px', textAlign:'center',
                            color: s === maxScore && s > 0 ? 'var(--y)' : 'var(--t2)',
                            fontWeight: s === maxScore && s > 0 ? 700 : 400,
                          }}>
                            {s > 0 ? s.toFixed(1) : '—'}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
