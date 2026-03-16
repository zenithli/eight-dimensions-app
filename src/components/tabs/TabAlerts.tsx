'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/shared/Card'
import type { PriceAlert } from '@/types/domain'

const LS_KEY = 'alerts_v7'

// localStorage フォールバック用
function loadFromLS(): PriceAlert[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveToLS(alerts: PriceAlert[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(alerts)) } catch {}
}

export function TabAlerts() {
  const [alerts, setAlerts]       = useState<PriceAlert[]>([])
  const [loading, setLoading]     = useState(true)
  const [dbOn, setDbOn]           = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [error, setError]         = useState('')
  const [form, setForm] = useState({
    code: '', name: '', alertType: 'below' as 'above' | 'below', price: '',
  })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { getAlerts } = await import('@/app/actions/alerts')
      setAlerts(await getAlerts())
      setDbOn(true)
    } catch {
      setDbOn(false)
      setAlerts(loadFromLS())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.code || !form.price) { setError('请填写代码和价格'); return }
    if (!/^\d{6}$/.test(form.code)) { setError('代码需为6位数字'); return }
    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) { setError('价格无效'); return }

    setAdding(true); setError('')
    try {
      const newAlert: PriceAlert = {
        code: form.code, name: form.name || form.code,
        alertType: form.alertType, price, triggered: false,
      }
      if (dbOn) {
        const { addAlert } = await import('@/app/actions/alerts')
        const saved = await addAlert(newAlert)
        setAlerts(prev => [saved, ...prev])
      } else {
        const withId = { ...newAlert, id: Date.now(), createdAt: new Date().toISOString() }
        const next = [withId, ...alerts]
        saveToLS(next); setAlerts(next)
      }
      setForm({ code:'', name:'', alertType:'below', price:'' })
      setShowForm(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '添加失败')
    } finally { setAdding(false) }
  }

  async function handleDelete(id: number) {
    try {
      if (dbOn) {
        const { deleteAlert } = await import('@/app/actions/alerts')
        await deleteAlert(id)
      } else {
        const next = alerts.filter(a => a.id !== id)
        saveToLS(next)
      }
      setAlerts(prev => prev.filter(a => a.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  const pending   = alerts.filter(a => !a.triggered)
  const triggered = alerts.filter(a => a.triggered)

  const S = {
    input: {
      backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
      color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:12,
      padding:'7px 10px', borderRadius:6, outline:'none', width:'100%',
    } as React.CSSProperties,
    select: {
      backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
      color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:12,
      padding:'7px 10px', borderRadius:6, outline:'none', width:'100%',
      cursor:'pointer',
    } as React.CSSProperties,
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* 統計 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[
          { label:'待触发',  value:`${pending.length}件`,   color:'var(--c)' },
          { label:'已触发',  value:`${triggered.length}件`, color:'var(--y)' },
          { label:'合计',    value:`${alerts.length}件`,    color:'var(--t2)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
            borderRadius:10, padding:'12px', textAlign:'center',
          }}>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:22, fontWeight:700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <Card title="ALERTS · 价格预警"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{
              fontFamily:'IBM Plex Mono', fontSize:9, padding:'2px 8px',
              border:`1px solid ${dbOn ? 'rgba(0,232,122,0.4)' : 'var(--bd)'}`,
              borderRadius:99, color: dbOn ? 'var(--g)' : 'var(--t3)',
            }}>
              {dbOn ? '● Supabase DB' : '○ localStorage'}
            </span>
            <button onClick={() => { setShowForm(v => !v); setError('') }} style={{
              fontFamily:'IBM Plex Mono', fontSize:10, padding:'5px 14px',
              border:'1px solid rgba(56,200,255,0.4)', borderRadius:5,
              color:'var(--c)', backgroundColor:'transparent', cursor:'pointer',
            }}>
              {showForm ? '✕ 取消' : '+ 添加预警'}
            </button>
          </div>
        }
      >
        {/* エラー */}
        {error && (
          <div style={{
            padding:'6px 12px', marginBottom:10, borderRadius:5,
            backgroundColor:'rgba(255,58,110,0.08)',
            border:'1px solid rgba(255,58,110,0.3)',
            color:'var(--r)', fontFamily:'IBM Plex Mono', fontSize:10,
          }}>✕ {error}</div>
        )}

        {/* 追加フォーム */}
        {showForm && (
          <div style={{
            backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
            borderRadius:8, padding:'14px', marginBottom:14,
          }}>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--c)', marginBottom:10 }}>
              新建价格预警
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:10 }}>
              <div>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>股票代码</div>
                <input style={S.input} placeholder="000815" maxLength={6}
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.replace(/\D/g,'').slice(0,6) }))} />
              </div>
              <div>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>股票名称</div>
                <input style={S.input} placeholder="美利云"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>方向</div>
                <select style={S.select} value={form.alertType}
                  onChange={e => setForm(f => ({ ...f, alertType: e.target.value as 'above' | 'below' }))}>
                  <option value="below">跌破（止损）</option>
                  <option value="above">突破（目标）</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>目标价格</div>
                <input style={S.input} placeholder="16.50" type="number" step="0.01"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => setShowForm(false)} style={{
                fontFamily:'IBM Plex Mono', fontSize:10, padding:'6px 14px',
                border:'1px solid var(--bd)', borderRadius:5,
                color:'var(--t2)', backgroundColor:'transparent', cursor:'pointer',
              }}>取消</button>
              <button onClick={handleAdd} disabled={adding} style={{
                fontFamily:'IBM Plex Mono', fontSize:10, padding:'6px 18px',
                border:'none', borderRadius:5, cursor: adding ? 'not-allowed' : 'pointer',
                backgroundColor:'var(--c)', color:'#000',
                opacity: adding ? 0.6 : 1,
              }}>
                {adding ? '添加中…' : '确认添加'}
              </button>
            </div>
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:11 }}>
            ⟳ 读取中…
          </div>
        )}

        {/* 空状態 */}
        {!loading && alerts.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>🔔</div>
            <div style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:12 }}>暂无价格预警</div>
            <div style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:10, marginTop:6, opacity:0.7 }}>
              设置止损价或目标价，系统将在行情更新时自动检查
            </div>
          </div>
        )}

        {/* 待触发 */}
        {!loading && pending.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:8 }}>
              待触发 ({pending.length})
            </div>
            <AlertTable alerts={pending} onDelete={handleDelete} />
          </div>
        )}

        {/* 已触发 */}
        {!loading && triggered.length > 0 && (
          <div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:8 }}>
              已触发 ({triggered.length})
            </div>
            <AlertTable alerts={triggered} onDelete={handleDelete} dimmed />
          </div>
        )}
      </Card>
    </div>
  )
}

// ── アラートテーブル ──
function AlertTable({
  alerts, onDelete, dimmed,
}: { alerts: PriceAlert[]; onDelete: (id: number) => void; dimmed?: boolean }) {
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'IBM Plex Mono', fontSize:11, opacity: dimmed ? 0.5 : 1 }}>
      <thead>
        <tr style={{ borderBottom:'1px solid var(--bd)' }}>
          {['股票','方向','目标价','状态','操作'].map((h: string) => (
            <th key={h} style={{ textAlign:'left', fontSize:9, color:'var(--t2)', paddingBottom:6, paddingRight:12, fontWeight:400 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {alerts.map(a => (
          <tr key={a.id} style={{ borderBottom:'1px solid rgba(56,200,255,0.04)' }}>
            <td style={{ padding:'8px 12px 8px 0' }}>
              <div style={{ fontWeight:700, color:'#fff' }}>{a.name}</div>
              <div style={{ fontSize:9, color:'var(--c)', fontFamily:'IBM Plex Mono' }}>{a.code}</div>
            </td>
            <td style={{ padding:'8px 12px 8px 0' }}>
              <span style={{
                fontSize:9, padding:'2px 7px', borderRadius:3,
                border: a.alertType === 'below' ? '1px solid rgba(255,58,110,0.4)' : '1px solid rgba(0,232,122,0.4)',
                color: a.alertType === 'below' ? 'var(--r)' : 'var(--g)',
              }}>
                {a.alertType === 'below' ? '↓ 跌破' : '↑ 突破'}
              </span>
            </td>
            <td style={{ padding:'8px 12px 8px 0', fontFamily:'IBM Plex Mono', color: a.alertType==='below' ? 'var(--r)' : 'var(--g)', fontWeight:700 }}>
              ¥{a.price.toFixed(2)}
            </td>
            <td style={{ padding:'8px 12px 8px 0' }}>
              {a.triggered
                ? <span style={{ color:'var(--y)', fontSize:10 }}>✓ 已触发</span>
                : <span style={{ color:'var(--c)', fontSize:10 }}>● 监控中</span>
              }
            </td>
            <td style={{ padding:'8px 0' }}>
              <button onClick={() => a.id && onDelete(a.id)} style={{
                fontSize:9, padding:'2px 8px',
                border:'1px solid rgba(255,58,110,0.3)', borderRadius:3,
                color:'var(--r)', backgroundColor:'transparent', cursor:'pointer',
              }}>
                删除
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
