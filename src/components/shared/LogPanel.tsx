'use client'

import { useState } from 'react'
import { useLogger, clearLogs, type LogLevel, type LogEntry } from '@/lib/logger'

const LEVEL_COLOR: Record<LogLevel, string> = {
  ok:    '#00e87a',
  info:  '#38c8ff',
  warn:  '#f7c948',
  error: '#ff3a6e',
  step:  '#c87aff',
  api:   '#38c8ff',
}

const LEVEL_ICON: Record<LogLevel, string> = {
  ok:    '✅',
  info:  'ℹ',
  warn:  '⚠',
  error: '✕',
  step:  '→',
  api:   '🌐',
}

type FilterLevel = LogLevel | 'all'

export function LogPanel() {
  const { logs } = useLogger()
  const [open,   setOpen]   = useState(false)
  const [filter, setFilter] = useState<FilterLevel>('all')

  const filtered = filter === 'all' ? logs : logs.filter((l: LogEntry) => l.level === filter)
  const errorCount = logs.filter((l: LogEntry) => l.level === 'error').length
  const warnCount  = logs.filter((l: LogEntry) => l.level === 'warn').length

  function exportLogs() {
    const text = logs.map((l: LogEntry) =>
      `[${l.ts}] [${l.level.toUpperCase()}] ${l.msg}${l.detail ? ' | ' + l.detail : ''}`
    ).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `log_${new Date().toISOString().slice(0,16).replace('T','_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 100,
      fontFamily: 'IBM Plex Mono',
    }}>
      {/* ── トグルバー ── */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '5px 16px',
          backgroundColor: 'var(--bg2)',
          borderTop: '1px solid var(--bd)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--t3)' }}>
          {open ? '▾' : '▸'} LOG
        </span>
        <span style={{ fontSize: 9, color: 'var(--t3)' }}>
          {logs.length}件
        </span>
        {errorCount > 0 && (
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 3,
            backgroundColor: 'rgba(255,58,110,0.15)',
            color: 'var(--r)', border: '1px solid rgba(255,58,110,0.3)',
          }}>
            ✕ {errorCount} エラー
          </span>
        )}
        {warnCount > 0 && (
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 3,
            backgroundColor: 'rgba(247,201,72,0.12)',
            color: 'var(--y)', border: '1px solid rgba(247,201,72,0.3)',
          }}>
            ⚠ {warnCount} 警告
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--t3)' }}>
          {open ? '閉じる' : 'ログを見る'}
        </span>
      </div>

      {/* ── ログパネル本体 ── */}
      {open && (
        <div style={{
          height: 260,
          backgroundColor: 'var(--bg)',
          borderTop: '1px solid var(--bd)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* ツールバー */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            borderBottom: '1px solid var(--bd)',
            flexShrink: 0,
          }}>
            {/* レベルフィルター */}
            {(['all', 'ok', 'info', 'warn', 'error', 'step', 'api'] as FilterLevel[]).map((lv: FilterLevel) => (
              <button key={lv} onClick={() => setFilter(lv)}
                style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 3,
                  border: `1px solid ${filter === lv
                    ? (lv === 'all' ? 'var(--c)' : LEVEL_COLOR[lv as LogLevel])
                    : 'var(--bd)'}`,
                  color: filter === lv
                    ? (lv === 'all' ? 'var(--c)' : LEVEL_COLOR[lv as LogLevel])
                    : 'var(--t3)',
                  backgroundColor: 'transparent', cursor: 'pointer',
                }}>
                {lv === 'all' ? '全部' : `${LEVEL_ICON[lv as LogLevel]} ${lv}`}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={exportLogs} style={{
                fontSize: 9, padding: '2px 8px',
                border: '1px solid var(--bd)', borderRadius: 3,
                color: 'var(--t2)', backgroundColor: 'transparent', cursor: 'pointer',
              }}>↓ 导出</button>
              <button onClick={() => clearLogs()} style={{
                fontSize: 9, padding: '2px 8px',
                border: '1px solid var(--bd)', borderRadius: 3,
                color: 'var(--r)', backgroundColor: 'transparent', cursor: 'pointer',
              }}>🗑 清空</button>
            </div>
          </div>

          {/* ログリスト */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '20px 0',
                fontSize: 10, color: 'var(--t3)',
              }}>
                ログなし
              </div>
            ) : (
              filtered.map((log: LogEntry) => (
                <LogRow key={log.id} log={log} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LogRow({ log }: { log: import('@/lib/logger').LogEntry; [k:string]:unknown }) {
  const [expanded, setExpanded] = useState(false)
  const color = LEVEL_COLOR[log.level]
  const icon  = LEVEL_ICON[log.level]
  const isError = log.level === 'error'
  const isWarn  = log.level === 'warn'
  const isOk    = log.level === 'ok'
  const isStep  = log.level === 'step'

  const bg = isError ? 'rgba(255,45,85,0.10)'
           : isWarn  ? 'rgba(255,204,0,0.07)'
           : isOk    ? 'rgba(0,200,83,0.05)'
           : isStep  ? 'rgba(0,180,204,0.05)'
           : 'transparent'

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 0,
        padding: '3px 0',
        paddingLeft: (isError || isWarn) ? 6 : 9,
        cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: isError ? '3px solid #ff2d55'
                  : isWarn  ? '3px solid #ffcc00' : 'none',
        background: bg,
      }}
    >
      {/* 時刻 */}
      <span style={{ color:'var(--t3)', minWidth:76, fontSize:9, flexShrink:0,
        fontFamily:'IBM Plex Mono', paddingTop:1 }}>
        {log.ts}
      </span>
      {/* ステップ */}
      <span style={{ color:'#2a5060', minWidth:52, fontSize:8, flexShrink:0,
        fontFamily:'IBM Plex Mono', paddingTop:2 }}>
        {log.step || ''}
      </span>
      {/* アイコン */}
      <span style={{ color, minWidth:16, fontSize:10, fontWeight:700, flexShrink:0 }}>
        {icon}
      </span>
      {/* メッセージ */}
      <span style={{ color, flex:1, wordBreak:'break-all', fontSize:10,
        fontWeight: isError ? 700 : 400 }}>
        {log.msg}
      </span>
      {/* 詳細 */}
      {log.detail && (
        <span
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          style={{
            color:'#3a5570', fontSize:9, maxWidth:200, overflow:'hidden',
            textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer',
            padding:'1px 6px', borderRadius:2,
            border:'1px solid #1a3050', marginLeft:6, flexShrink:0,
          }}
          title={log.detail}
        >
          {log.detail.slice(0,40)}{log.detail.length > 40 ? '…' : ''}
        </span>
      )}
      {/* 展開詳細 */}
      {expanded && log.detail && (
        <div style={{
          fontSize:9, color:'var(--t2)', marginTop:2,
          paddingLeft:152, borderTop:'1px solid rgba(56,200,255,0.08)',
          lineHeight:1.6, wordBreak:'break-all', width:'100%',
        }}>
          {log.detail}
        </div>
      )}
    </div>
  )
}
