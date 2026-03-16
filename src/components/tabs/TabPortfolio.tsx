'use client'

import { useState, useEffect, useCallback } from 'react'
import { calcCsvImportDiff } from '@/app/actions/csv-import'
import { TradeLogicPanel } from '@/components/shared/TradeLogicPanel'
import { Card } from '@/components/shared/Card'
import type { PortfolioItem } from '@/types/domain'

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { code:'000815', name:'美利云',   cost:17.92, price:0, qty:21900, role:'进攻矛①守'        },
  { code:'601225', name:'陕西煤业', cost:0,     price:0, qty:0,     role:'新进攻矛②'        },
  { code:'601101', name:'昊华能源', cost:0,     price:0, qty:0,     role:'新进攻矛③'        },
  { code:'159326', name:'电网ETF',  cost:2.11,  price:0, qty:212500,role:'ETF盾牌①'         },
  { code:'000977', name:'浪潮信息', cost:63.69, price:0, qty:0,     role:'观察'             },
  { code:'002371', name:'北方华创', cost:521.67,price:0, qty:0,     role:'观察'             },
  { code:'300308', name:'中际旭创', cost:545.0, price:0, qty:500,   role:'条件止损530元'    },
  { code:'600598', name:'北大荒',   cost:0,     price:0, qty:0,     role:'越跌越买候选'     },
]

export function TabPortfolio() {
  const [items, setItems]         = useState<PortfolioItem[]>([])
  const [csvModal, setCsvModal]   = useState(false)
  const [editModal, setEditModal]  = useState(false)
  const [batchLoad, setBatchLoad] = useState(false)

  const [dbOn, setDbOn] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { getPortfolio } = await import('@/app/actions/portfolio')
        const data = await getPortfolio()
        if (data.length > 0) {
          setItems(data); setDbOn(true); return
        }
      } catch { /* DB未設定 → localStorage フォールバック */ }
      const saved = localStorage.getItem('portfolio_v7')
      if (saved) {
        try { setItems(JSON.parse(saved)) } catch { setItems(DEFAULT_PORTFOLIO) }
      } else { setItems(DEFAULT_PORTFOLIO) }
    }
    load()
  }, [])

  const save = useCallback(async (next: PortfolioItem[]) => {
    setItems(next)
    // DB があれば DB にも保存
    if (dbOn) {
      try {
        const { savePortfolio } = await import('@/app/actions/portfolio')
        await savePortfolio(next.map(p => ({
          code: p.code, name: p.name, cost: p.cost, qty: p.qty, role: p.role,
        })))
      } catch (e) { console.warn('[Portfolio] DB保存スキップ:', e) }
    }
    localStorage.setItem('portfolio_v7', JSON.stringify(next))
  }, [dbOn])

  async function batchScore() {
    const apiKey = localStorage.getItem('qtkey') || ''
    if (!apiKey) { alert('请先保存 API Key'); return }
    setBatchLoad(true)
    // TODO: 各持仓を順次 /api/analyze で評価
    setTimeout(() => setBatchLoad(false), 2000)
  }

  const btnStyle = (color: string, bg: string) => ({
    display:'inline-flex' as const, alignItems:'center' as const, gap:5,
    fontFamily:'IBM Plex Mono', fontSize:11, padding:'6px 14px',
    backgroundColor:bg, border:`1px solid ${color}`,
    color, borderRadius:6, cursor:'pointer' as const, transition:'all .15s',
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Card
        title="PORTFOLIO · 持仓总览"
        action={
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{
              fontFamily:'IBM Plex Mono', fontSize:9, padding:'2px 8px',
              border:`1px solid ${dbOn ? 'rgba(0,232,122,0.4)' : 'var(--bd)'}`,
              borderRadius:99, color: dbOn ? 'var(--g)' : 'var(--t3)',
            }}>{dbOn ? '● Supabase DB' : '○ localStorage'}</span>
            <button onClick={() => setCsvModal(true)}
              style={btnStyle('var(--g)','rgba(0,232,122,0.06)')}>
              📥 CSV导入
            </button>
            <button onClick={() => setEditModal(true)}
              style={btnStyle('var(--t2)','transparent')}>
              ✏️ 编辑持仓
            </button>
          </div>
        }
      >
        {/* 持仓カードグリッド */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',
          gap:10, marginBottom:14,
        }}>
          {items.map(item => <PortCard key={item.code} item={item} />)}
        </div>

        {/* バッチ評価ボタン */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          paddingTop:12, borderTop:'1px solid var(--bd)',
        }}>
          <button onClick={batchScore} disabled={batchLoad}
            style={{
              ...btnStyle('var(--y)','rgba(247,201,72,0.06)'),
              opacity: batchLoad ? 0.5 : 1,
            }}>
            {batchLoad ? '⟳ 评分中…' : '⚡ 批量评分所有持仓'}
          </button>
          <button style={btnStyle('var(--r)','rgba(255,58,110,0.06)')}>
            🔄 强制全部刷新
          </button>
          <span style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t3)' }}>
            共 {items.length} 只
          </span>
        </div>
      </Card>

      {csvModal && (
        <CsvModal
          currentItems={items}
          onImport={save}
          onClose={() => setCsvModal(false)}
        />
      )}

      {editModal && (
        <EditPortfolioModal
          items={items}
          onSave={save}
          onClose={() => setEditModal(false)}
        />
      )}
    </div>
  )
}

// ── 持仓カード ──
function PortCard({ item }: { item: PortfolioItem }) {
  const [showLogic, setShowLogic] = useState(false)
  const hasCost  = item.cost > 0
  const hasPrice = item.price > 0
  const pnl = hasCost && hasPrice
    ? (item.price - item.cost) / item.cost * 100 : null
  const hasLogic = !!(item.logic?.whyBuy || item.logic?.sellCondition || item.logic?.notSell)

  async function handleSaveLogic(code: string, logic: import('@/types/domain').TradeLogic) {
    const { saveTradeLogic } = await import('@/app/actions/portfolio')
    await saveTradeLogic(code, logic)
    // ページリロードなしで更新（楽観的更新）
    item.logic = { ...logic, updatedAt: new Date().toISOString() }
  }

  return (
    <div style={{
      backgroundColor:'var(--bg3)',
      border:`1px solid ${showLogic ? 'var(--c)' : 'var(--bd)'}`,
      borderRadius:8, padding:'12px',
      transition:'border-color .15s',
    }}>
      <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t3)', marginBottom:3 }}>
        {item.code}
      </div>
      <div style={{ fontWeight:700, color:'#fff', fontSize:14, marginBottom:4 }}>
        {item.name}
      </div>
      <div style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--t2)', marginBottom:6 }}>
        成本 {hasCost ? `${item.cost.toFixed(2)}元` : '—'}
        {item.qty > 0 && <span style={{ marginLeft:8, color:'var(--t3)' }}>{item.qty.toLocaleString()}股</span>}
      </div>
      {pnl !== null && (
        <div style={{
          fontFamily:'IBM Plex Mono', fontSize:12, fontWeight:700,
          color: pnl >= 0 ? 'var(--r)' : 'var(--g)',
          marginBottom:6,
        }}>
          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{
          display:'inline-block',
          fontSize:9, fontFamily:'IBM Plex Mono',
          padding:'2px 7px',
          border:'1px solid var(--bd)', borderRadius:3,
          color:'var(--t3)',
        }}>
          {item.role}
        </div>
        <button
          onClick={() => setShowLogic(v => !v)}
          style={{
            fontFamily:'IBM Plex Mono', fontSize:9,
            padding:'2px 7px',
            border:`1px solid ${hasLogic ? 'rgba(0,232,122,0.4)' : 'var(--bd)'}`,
            borderRadius:3,
            color: hasLogic ? 'var(--g)' : 'var(--t3)',
            backgroundColor:'transparent', cursor:'pointer',
          }}
          title="持仓理由档案"
        >
          {hasLogic ? '📋 理由' : '+ 理由'}
        </button>
      </div>

      {showLogic && (
        <TradeLogicPanel
          code={item.code}
          name={item.name}
          logic={item.logic}
          onSave={handleSaveLogic}
        />
      )}
    </div>
  )
}

// ── CSV导入モーダル ──
function CsvModal({
  currentItems, onImport, onClose,
}: {
  currentItems: PortfolioItem[]
  onImport: (items: PortfolioItem[]) => void
  onClose: () => void
}) {
  const [csvText, setCsvText]   = useState('')
  const [parsing, setParsing]   = useState(false)
  const [diff, setDiff]         = useState<null | unknown[]>(null)
  const [stats, setStats]       = useState({ added:0, updated:0, skipped:0 })
  const [parseErr, setParseErr] = useState('')

  async function preview() {
    if (!csvText.trim()) return
    setParsing(true); setParseErr(''); setDiff(null)
    try {
      // CSV diff計算 → Server Action（外部API不要の純粋計算）
      const result = await calcCsvImportDiff(csvText, currentItems)
      if (!result.ok) throw new Error(result.error)
      setDiff(result.diff)
      setStats({ added:result.added, updated:result.updated, skipped:result.skipped })
    } catch (e: unknown) {
      setParseErr(e instanceof Error ? e.message : '解析失败')
    } finally { setParsing(false) }
  }

  function doImport() {
    if (!diff) return
    // diff を持仓に反映
    const updated = [...currentItems]
    for (const row of diff as Array<{code:string;name:string;cost:number;qty:number;price:number;status:string;oldCost?:number}>) {
      if (row.status === 'new') {
        updated.push({ code:row.code, name:row.name, cost:row.cost,
                       price:row.price||row.cost, qty:row.qty, role:'CSV导入' })
      } else if (row.status === 'update') {
        const idx = updated.findIndex(p => p.code === row.code)
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], cost:row.cost,
            price:row.price||updated[idx].price, qty:row.qty||updated[idx].qty }
        }
      }
    }
    onImport(updated)
    onClose()
  }

  const hasAction = stats.added > 0 || stats.updated > 0

  return (
    <div style={{
      position:'fixed', inset:0,
      backgroundColor:'rgba(0,0,0,0.82)',
      zIndex:50, display:'flex', alignItems:'center', justifyContent:'center',
      padding:16,
    }}>
      <div style={{
        backgroundColor:'var(--bg2)',
        border:'1px solid var(--bd)',
        borderRadius:12, width:'100%', maxWidth:720,
        maxHeight:'90vh', overflowY:'auto',
        padding:24, position:'relative',
      }}>
        <button onClick={onClose} style={{
          position:'absolute', top:14, right:16,
          background:'transparent', border:'1px solid var(--bd)',
          color:'var(--t2)', borderRadius:4, cursor:'pointer',
          width:28, height:28, fontSize:13,
        }}>✕</button>

        <div style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--g)', letterSpacing:'0.12em', marginBottom:16 }}>
          📥 CSV持仓导入
        </div>

        {/* 仕様説明 */}
        <div style={{
          backgroundColor:'rgba(56,200,255,0.05)',
          border:'1px solid rgba(56,200,255,0.18)',
          borderRadius:6, padding:'10px 14px', marginBottom:14,
          fontSize:11, color:'var(--t2)', lineHeight:1.9,
        }}>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--c)', fontWeight:700, marginBottom:4 }}>
            支持格式（华泰证券持仓导出）
          </div>
          必填列：<code style={{ color:'var(--c)', fontFamily:'IBM Plex Mono' }}>证券代码</code>、
          <code style={{ color:'var(--c)', fontFamily:'IBM Plex Mono' }}>证券名称</code>、
          <code style={{ color:'var(--c)', fontFamily:'IBM Plex Mono' }}>成本价</code>（或"成本均价"）<br />
          可选列：持仓数量、最新价 · 逗号或Tab均可 · 支持GBK/UTF-8
        </div>

        {/* テキストエリア */}
        <textarea
          value={csvText}
          onChange={e => { setCsvText(e.target.value); setDiff(null) }}
          rows={7}
          placeholder={'粘贴CSV数据，例如：\n证券代码,证券名称,成本价,持仓数量,最新价\n000815,美利云,17.92,21900,18.84'}
          style={{
            width:'100%',
            backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
            color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:11,
            padding:'10px 12px', borderRadius:6, outline:'none',
            resize:'vertical', lineHeight:1.7, marginBottom:8,
          }}
        />

        {/* ファイル選択 + プレビューボタン */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <label style={{
            display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
            fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--c)',
            border:'1px solid rgba(56,200,255,0.4)', padding:'5px 12px', borderRadius:5,
          }}>
            📂 选择文件
            <input type="file" accept=".csv,.txt" style={{ display:'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                const reader = new FileReader()
                reader.onload = ev => { setCsvText(ev.target?.result as string); setDiff(null) }
                try { reader.readAsText(f, 'GBK') } catch { reader.readAsText(f, 'UTF-8') }
              }}
            />
          </label>
          <button onClick={preview} disabled={parsing || !csvText.trim()}
            style={{
              fontFamily:'IBM Plex Mono', fontSize:10, padding:'5px 14px',
              border:'1px solid rgba(247,201,72,0.4)', color:'var(--y)',
              backgroundColor:'transparent', borderRadius:5, cursor:'pointer',
              opacity: (!csvText.trim() || parsing) ? 0.5 : 1,
            }}>
            {parsing ? '⟳ 解析中…' : '🔍 预览'}
          </button>
        </div>

        {/* エラー */}
        {parseErr && (
          <div style={{
            padding:'6px 12px', marginBottom:10, borderRadius:5,
            backgroundColor:'rgba(255,58,110,0.08)',
            border:'1px solid rgba(255,58,110,0.3)',
            color:'var(--r)', fontFamily:'IBM Plex Mono', fontSize:10,
          }}>✕ {parseErr}</div>
        )}

        {/* プレビュー結果 */}
        {diff && (
          <div style={{ marginBottom:14 }}>
            {/* 統計バー */}
            <div style={{
              padding:'6px 12px', marginBottom:8, borderRadius:5,
              backgroundColor:'rgba(0,232,122,0.05)',
              border:'1px solid rgba(0,232,122,0.2)',
              color:'var(--g)', fontFamily:'IBM Plex Mono', fontSize:10,
            }}>
              新增 {stats.added} 只 · 更新成本 {stats.updated} 只 · 跳过 {stats.skipped} 只
            </div>
            {/* diff テーブル */}
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'IBM Plex Mono', fontSize:11 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--bd)' }}>
                    {['状态','代码','名称','成本价','数量','说明'].map((h: string) => (
                      <th key={h} style={{
                        textAlign:'left', fontSize:9, color:'var(--t3)',
                        paddingBottom:6, paddingRight:10, fontWeight:400,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(diff as Array<{code:string;name:string;cost:number;qty:number;status:string;oldCost?:number}>).map((row, i) => {
                    const statusColor = row.status==='new' ? 'var(--g)' : row.status==='update' ? 'var(--y)' : 'var(--t3)'
                    const statusLabel = row.status==='new' ? '新增' : row.status==='update' ? '更新' : '一致'
                    return (
                      <tr key={i} style={{
                        borderBottom:'1px solid rgba(56,200,255,0.04)',
                        opacity: row.status === 'same' ? 0.45 : 1,
                      }}>
                        <td style={{ padding:'6px 10px 6px 0' }}>
                          <span style={{
                            fontSize:9, padding:'1px 6px', borderRadius:3,
                            border:`1px solid ${statusColor}18`,
                            color:statusColor, backgroundColor:`${statusColor}12`,
                          }}>{statusLabel}</span>
                        </td>
                        <td style={{ padding:'6px 10px 6px 0', color:'var(--c)' }}>{row.code}</td>
                        <td style={{ padding:'6px 10px 6px 0', color:'#fff', fontWeight:700 }}>{row.name}</td>
                        <td style={{ padding:'6px 10px 6px 0' }}>{row.cost.toFixed(2)}</td>
                        <td style={{ padding:'6px 10px 6px 0', color:'var(--t2)' }}>
                          {row.qty > 0 ? row.qty.toLocaleString() : '—'}
                        </td>
                        <td style={{ padding:'6px 0 6px 0', fontSize:10, color:'var(--t2)' }}>
                          {row.status==='update' ? `${row.oldCost?.toFixed(2)} → ${row.cost.toFixed(2)}` : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {stats.updated > 0 && (
              <div style={{
                marginTop:8, padding:'6px 12px', borderRadius:5,
                backgroundColor:'rgba(247,201,72,0.05)',
                border:'1px solid rgba(247,201,72,0.2)',
                color:'var(--y)', fontFamily:'IBM Plex Mono', fontSize:10,
              }}>
                ⚠️ 有 {stats.updated} 只成本价将被更新，建议先截图备份
              </div>
            )}
          </div>
        )}

        {/* ボタン */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{
            padding:'9px 20px', fontFamily:'IBM Plex Mono', fontSize:11,
            border:'1px solid var(--bd)', color:'var(--t2)',
            backgroundColor:'transparent', borderRadius:6, cursor:'pointer',
          }}>取消</button>
          <button onClick={doImport} disabled={!diff || !hasAction} style={{
            padding:'9px 24px', fontFamily:'IBM Plex Mono', fontSize:11, fontWeight:700,
            border:'none', backgroundColor:'var(--g)', color:'#000',
            borderRadius:6, cursor: (!diff || !hasAction) ? 'not-allowed' : 'pointer',
            opacity: (!diff || !hasAction) ? 0.4 : 1,
          }}>确认导入</button>
        </div>
      </div>
    </div>
  )
}


// ── 持仓編集モーダル ──
function EditPortfolioModal({
  items, onSave, onClose,
}: {
  items:   PortfolioItem[]
  onSave:  (next: PortfolioItem[]) => Promise<void>
  onClose: () => void
}) {
  const [rows, setRows] = useState(
    items.map(p => ({ ...p, costStr: p.cost > 0 ? String(p.cost) : '' }))
  )
  const [saving, setSaving] = useState(false)

  function updateRow(i: number, field: string, val: string) {
    setRows(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: val }
      return next
    })
  }

  function removeRow(i: number) {
    if (!confirm(`${rows[i].name} を持仓から削除しますか？`)) return
    setRows(prev => prev.filter((_,idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const next: PortfolioItem[] = rows.map(r => ({
        code:  r.code,
        name:  r.name,
        cost:  parseFloat(r.costStr) || 0,
        price: r.price,
        qty:   r.qty,
        role:  r.role,
        logic: r.logic,
      }))
      await onSave(next)
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg3)',
    border: '1px solid var(--bd)',
    color: 'var(--t)',
    fontFamily: 'IBM Plex Mono',
    fontSize: 11,
    padding: '5px 8px',
    borderRadius: 4,
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{
      position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.82)',
      zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      <div style={{
        backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
        borderRadius:12, width:'100%', maxWidth:720,
        maxHeight:'90vh', overflowY:'auto', padding:24, position:'relative',
      }}>
        <button onClick={onClose} style={{
          position:'absolute', top:14, right:16, background:'transparent',
          border:'1px solid var(--bd)', color:'var(--t2)',
          borderRadius:4, cursor:'pointer', width:28, height:28, fontSize:13,
        }}>✕</button>

        <div style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--c)', letterSpacing:'0.12em', marginBottom:16 }}>
          ✏️ 编辑持仓
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'IBM Plex Mono', fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--bd)' }}>
                {['代码','名称','成本价','数量','角色/备注','操作'].map((h: string) => (
                  <th key={h} style={{
                    textAlign:'left', fontSize:9, color:'var(--t3)',
                    paddingBottom:8, paddingRight:8, fontWeight:400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.code} style={{ borderBottom:'1px solid rgba(56,200,255,0.05)' }}>
                  <td style={{ padding:'8px 8px 8px 0', color:'var(--c)', fontFamily:'IBM Plex Mono' }}>
                    {row.code}
                  </td>
                  <td style={{ padding:'8px 8px 8px 0', minWidth:80 }}>
                    <input style={inputStyle} value={row.name}
                      onChange={e => updateRow(i, 'name', e.target.value)} />
                  </td>
                  <td style={{ padding:'8px 8px 8px 0', minWidth:80 }}>
                    <input style={inputStyle} type="number" step="0.01"
                      placeholder="0.00" value={row.costStr || ''}
                      onChange={e => updateRow(i, 'costStr', e.target.value)} />
                  </td>
                  <td style={{ padding:'8px 8px 8px 0', minWidth:70 }}>
                    <input style={inputStyle} type="number" step="100"
                      placeholder="0" value={row.qty || ''}
                      onChange={e => updateRow(i, 'qty', e.target.value)} />
                  </td>
                  <td style={{ padding:'8px 8px 8px 0', minWidth:120 }}>
                    <input style={inputStyle} value={row.role}
                      onChange={e => updateRow(i, 'role', e.target.value)} />
                  </td>
                  <td style={{ padding:'8px 0' }}>
                    <button onClick={() => removeRow(i)} style={{
                      fontSize:9, padding:'3px 8px',
                      border:'1px solid rgba(255,58,110,0.3)', borderRadius:3,
                      color:'var(--r)', backgroundColor:'transparent', cursor:'pointer',
                    }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={onClose} style={{
            fontFamily:'IBM Plex Mono', fontSize:11, padding:'7px 18px',
            border:'1px solid var(--bd)', borderRadius:5,
            color:'var(--t2)', backgroundColor:'transparent', cursor:'pointer',
          }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{
            fontFamily:'IBM Plex Mono', fontSize:11, fontWeight:700, padding:'7px 22px',
            border:'none', borderRadius:5,
            cursor: saving ? 'not-allowed' : 'pointer',
            backgroundColor:'var(--c)', color:'#000',
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? '保存中…' : '确认保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
