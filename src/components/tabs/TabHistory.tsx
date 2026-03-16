'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/shared/Card'
import { getBSignal } from '@/lib/core/b-score'
import { fmtPct } from '@/lib/core/format'
import type { HistoryEntry } from '@/types/domain'

// ── 八维度次元メタ
const DIM_META = [
  { icon:'①', name:'趋势共振',   color:'#38c8ff' },
  { icon:'②', name:'量能加速',   color:'#00e87a' },
  { icon:'③', name:'Alpha超额',  color:'#f7c948' },
  { icon:'④', name:'威科夫阶段', color:'#c87aff' },
  { icon:'⑤', name:'板块生态',   color:'#38c8ff' },
  { icon:'⑥', name:'资金流向',   color:'#00e87a' },
  { icon:'⑦', name:'基本面锚',   color:'#f7c948' },
  { icon:'⑧', name:'乖离率控制', color:'#ff3a6e' },
]

// HistoryEntry に scoresJson を付加した拡張型
interface HistoryEntryFull extends HistoryEntry {
  scoresJson?: string
  summary?:    string
}

// localStorage キー（DB未設定時のフォールバック）
const LS_KEY = 'history_v7'

export function TabHistory() {
  const [entries, setEntries]         = useState<HistoryEntryFull[]>([])
  const [loading, setLoading]         = useState(true)
  const [filterCode, setFilterCode]   = useState<string>('all')
  const [expandedId, setExpandedId]   = useState<number | null>(null)
  const [clearing, setClearing]       = useState(false)
  const [dbConnected, setDbConnected] = useState(false)
  const [error, setError]             = useState('')

  // ── 履歴取得（DB → localStorage フォールバック）──
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Server Action 経由で DB から取得
      const { getHistory } = await import('@/app/actions/history')
      const data = await getHistory(100)
      setEntries(data as HistoryEntryFull[])
      setDbConnected(true)
    } catch {
      // DB未設定 or 接続失敗 → localStorage フォールバック
      setDbConnected(false)
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) setEntries(JSON.parse(raw))
        else     setEntries([])
      } catch {
        setEntries([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── 全件クリア ──
  async function clearAll() {
    if (!confirm(`全 ${entries.length} 件の履歴を削除しますか？`)) return
    setClearing(true)
    try {
      if (dbConnected) {
        const { clearHistory } = await import('@/app/actions/history')
        await clearHistory()
      } else {
        localStorage.removeItem(LS_KEY)
      }
      setEntries([])
      setFilterCode('all')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '削除失敗')
    } finally {
      setClearing(false)
    }
  }

  // ── フィルター用ユニーク銘柄リスト ──
  const uniqueCodes = Array.from(
    new Map(entries.map(e => [e.code, e.name])).entries()
  ).map(([code, name]) => ({ code, name }))

  const filtered = filterCode === 'all'
    ? entries
    : entries.filter(e => e.code === filterCode)

  // ── 統計 ──
  const stats = {
    total:   entries.length,
    buyCount:   entries.filter(e => e.signal === '买入' || e.signal === '积极关注').length,
    avgScore:   entries.length
      ? +(entries.reduce((s, e) => s + e.totalScore, 0) / entries.length).toFixed(2)
      : 0,
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* ── 統計バー ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[
          { label:'分析总数',     value:`${stats.total}件`,        color:'var(--c)' },
          { label:'买入/积极关注', value:`${stats.buyCount}件`,     color:'var(--g)' },
          { label:'平均B分',      value:stats.avgScore || '—',     color:'var(--y)' },
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

      {/* ── メインカード ── */}
      <Card
        title="HISTORY · 历史分析记录"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {/* DB/localStorage 表示 */}
            <span style={{
              fontFamily:'IBM Plex Mono', fontSize:9, padding:'2px 8px',
              border:`1px solid ${dbConnected ? 'rgba(0,232,122,0.4)' : 'var(--bd)'}`,
              borderRadius:99,
              color: dbConnected ? 'var(--g)' : 'var(--t3)',
            }}>
              {dbConnected ? '● Supabase DB' : '○ localStorage'}
            </span>

            <button onClick={load} style={{
              fontFamily:'IBM Plex Mono', fontSize:10, padding:'5px 12px',
              border:'1px solid var(--bd)', borderRadius:5,
              color:'var(--t2)', backgroundColor:'transparent', cursor:'pointer',
            }}>
              ↻ 更新
            </button>

            {entries.length > 0 && (
              <button onClick={clearAll} disabled={clearing} style={{
                fontFamily:'IBM Plex Mono', fontSize:10, padding:'5px 12px',
                border:'1px solid rgba(255,58,110,0.4)', borderRadius:5,
                color:'var(--r)', backgroundColor:'transparent',
                cursor: clearing ? 'not-allowed' : 'pointer',
                opacity: clearing ? 0.5 : 1,
              }}>
                {clearing ? '削除中…' : '🗑 清空全部'}
              </button>
            )}
          </div>
        }
      >
        {/* エラー表示 */}
        {error && (
          <div style={{
            padding:'6px 12px', marginBottom:10, borderRadius:5,
            backgroundColor:'rgba(255,58,110,0.08)',
            border:'1px solid rgba(255,58,110,0.3)',
            color:'var(--r)', fontFamily:'IBM Plex Mono', fontSize:10,
          }}>✕ {error}</div>
        )}

        {/* 銘柄フィルター */}
        {uniqueCodes.length > 1 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
            <button onClick={() => setFilterCode('all')}
              style={filterBtnStyle(filterCode === 'all')}>
              全部 ({entries.length})
            </button>
            {uniqueCodes.map(({ code, name }) => (
              <button key={code} onClick={() => setFilterCode(code)}
                style={filterBtnStyle(filterCode === code)}>
                {name} ({entries.filter(e => e.code === code).length})
              </button>
            ))}
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:11 }}>
            ⟳ 読み込み中…
          </div>
        )}

        {/* 空状態 */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <div style={{
              width:48, height:48, margin:'0 auto 12px',
              border:'1px solid var(--bd)', borderRadius:12,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20,
            }}>📅</div>
            <div style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:12 }}>
              暂无分析记录
            </div>
            <div style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:10, marginTop:6, opacity:0.7 }}>
              在「单股分析」Tab 中分析股票后，记录将自动保存到这里
            </div>
          </div>
        )}

        {/* 履歴テーブル */}
        {!loading && filtered.length > 0 && (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'IBM Plex Mono', fontSize:11 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--bd)' }}>
                  {['日時','股票','价格','B分','信号','止损','目标','盈亏比','详情'].map((h: string) => (
                    <th key={h} style={{
                      textAlign:'left', fontSize:9, color:'var(--t2)',
                      paddingBottom:8, paddingRight:10, fontWeight:500, letterSpacing:'0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* フッター */}
        {!loading && filtered.length > 0 && (
          <div style={{
            marginTop:10, paddingTop:10, borderTop:'1px solid var(--bd)',
            fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)',
          }}>
            表示: {filtered.length}件 / 全{entries.length}件
            {dbConnected ? '  · Supabase DB から取得' : '  · localStorage から取得'}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── 履歴テーブル行 ──
function HistoryRow({
  entry, expanded, onToggle,
}: {
  entry:    HistoryEntryFull
  expanded: boolean
  onToggle: () => void
}) {
  const signal  = getBSignal(entry.totalScore)
  const pctColor = entry.changePct > 0 ? 'var(--r)' : entry.changePct < 0 ? 'var(--g)' : 'var(--t3)'

  // scoresJson をパース
  const scores: Array<{ dim: number; name: string; score: number; analysis: string }> = (() => {
    try { return JSON.parse(entry.scoresJson || '[]') } catch { return [] }
  })()

  // 日時フォーマット（北京時間で表示）
  const dateStr = (() => {
    try {
      const d = new Date(entry.createdAt)
      if (isNaN(d.getTime())) return '—'
      // UTC→CST(+8)
      const cst = new Date(d.getTime() + 8 * 3600000)
      return `${String(cst.getUTCMonth()+1).padStart(2,'0')}/${String(cst.getUTCDate()).padStart(2,'0')} ${String(cst.getUTCHours()).padStart(2,'0')}:${String(cst.getUTCMinutes()).padStart(2,'0')}`
    } catch { return '—' }
  })()

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          borderBottom: expanded ? 'none' : '1px solid rgba(56,200,255,0.05)',
          cursor:'pointer',
          transition:'background .1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor='rgba(56,200,255,0.03)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor='transparent')}
      >
        {/* 日時 */}
        <td style={{ padding:'9px 10px 9px 0', color:'var(--t2)', whiteSpace:'nowrap', fontFamily:'IBM Plex Mono' }}>
          {dateStr}
        </td>
        {/* 銘柄 */}
        <td style={{ padding:'9px 10px 9px 0' }}>
          <div style={{ fontWeight:700, color:'var(--c)' }}>{entry.name}</div>
          <div style={{ fontSize:9, color:'var(--c)', fontFamily:'IBM Plex Mono' }}>{entry.code}</div>
        </td>
        {/* 価格 */}
        <td style={{ padding:'9px 10px 9px 0' }}>
          <div style={{ color:'var(--c)', fontFamily:'IBM Plex Mono' }}>¥{entry.price.toFixed(2)}</div>
          <div style={{ fontSize:9, color:pctColor }}>{fmtPct(entry.changePct)}</div>
        </td>
        {/* B分 */}
        <td style={{ padding:'9px 10px 9px 0' }}>
          <span style={{ color:signal.color, fontWeight:700 }}>{entry.totalScore.toFixed(2)}</span>
        </td>
        {/* シグナル */}
        <td style={{ padding:'9px 10px 9px 0' }}>
          <span style={{
            fontSize:9, padding:'2px 7px', borderRadius:3,
            border:`1px solid ${signal.color}30`,
            color:signal.color, backgroundColor:`${signal.color}12`,
          }}>
            {entry.signal}
          </span>
        </td>
        {/* 止損 */}
        <td style={{ padding:'9px 10px 9px 0', color:'var(--r)', fontFamily:'IBM Plex Mono' }}>
          {entry.stopLoss ? `¥${entry.stopLoss.toFixed(2)}` : '—'}
        </td>
        {/* 目標 */}
        <td style={{ padding:'9px 10px 9px 0', color:'var(--g)', fontFamily:'IBM Plex Mono' }}>
          {entry.targetPrice ? `¥${entry.targetPrice.toFixed(2)}` : '—'}
        </td>
        {/* 盈亏比 */}
        <td style={{ padding:'9px 10px 9px 0', color:'var(--y)', fontFamily:'IBM Plex Mono' }}>
          {entry.riskRatio || '—'}
        </td>
        {/* 展開ボタン */}
        <td style={{ padding:'9px 0 9px 0' }}>
          <span style={{
            color:'var(--t3)', fontSize:11,
            transform: expanded ? 'rotate(180deg)' : 'none',
            display:'inline-block', transition:'transform .2s',
          }}>▾</span>
        </td>
      </tr>

      {/* ── 展開：八维度スコア詳細 ── */}
      {expanded && (
        <tr>
          <td colSpan={9} style={{ padding:'0 0 12px 0', borderBottom:'1px solid rgba(56,200,255,0.05)' }}>
            <div style={{
              backgroundColor:'var(--bg3)',
              border:'1px solid var(--bd)',
              borderRadius:8, padding:'14px 16px', margin:'4px 0 0',
            }}>
              {/* サマリー */}
              {entry.summary && (
                <div style={{
                  fontSize:11, color:'var(--t2)', lineHeight:1.8,
                  marginBottom:12, paddingBottom:12,
                  borderBottom:'1px solid var(--bd)',
                }}>
                  {entry.summary}
                </div>
              )}

              {/* 八维度スコアバー */}
              {scores.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {scores.map((s, i) => {
                    const meta = DIM_META[i] ?? { icon:`⑨`, name:s.name, color:'var(--t2)' }
                    const pct  = (s.score / 5) * 100
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, width:16, flexShrink:0, color:meta.color }}>
                          {meta.icon}
                        </span>
                        <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t2)', width:70, flexShrink:0 }}>
                          {meta.name}
                        </span>
                        <div style={{ flex:1, backgroundColor:'var(--bg2)', borderRadius:99, height:5, overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:99, width:`${pct}%`, backgroundColor:meta.color }} />
                        </div>
                        <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, fontWeight:700, width:24, textAlign:'right', flexShrink:0, color:meta.color }}>
                          {s.score > 0 ? s.score.toFixed(1) : '—'}
                        </span>
                        {s.analysis && (
                          <span style={{ fontSize:10, color:'var(--t3)', flex:2, marginLeft:8, lineHeight:1.6 }}>
                            {s.analysis}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:10 }}>
                  スコア詳細なし
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// フィルターボタンスタイル
function filterBtnStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily:'IBM Plex Mono', fontSize:10, padding:'4px 12px',
    border:`1px solid ${active ? 'var(--c)' : 'var(--bd)'}`,
    borderRadius:99,
    color: active ? 'var(--c)' : 'var(--t2)',
    backgroundColor: active ? 'rgba(56,200,255,0.10)' : 'transparent',
    cursor:'pointer', transition:'all .15s',
  }
}
