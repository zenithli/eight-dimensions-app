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

function LogRow({ log }: { log: import('@/lib/logger').LogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const color = LEVEL_COLOR[log.level]
  const icon  = LEVEL_ICON[log.level]

  return (
    <div
      onClick={() => log.detail && setExpanded(v => !v)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '3px 12px',
        cursor: log.detail ? 'pointer' : 'default',
        borderBottom: '1px solid rgba(56,200,255,0.03)',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(56,200,255,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {/* 時刻 */}
      <span style={{ fontSize: 9, color: 'var(--t3)', flexShrink: 0, paddingTop: 2 }}>
        {log.ts}
      </span>
      {/* レベルアイコン */}
      <span style={{ fontSize: 10, flexShrink: 0, color }}>{icon}</span>
      {/* ステップ */}
      {log.step && (
        <span style={{
          fontSize: 8, padding: '0 4px',
          border: `1px solid ${color}40`, borderRadius: 2,
          color, flexShrink: 0,
        }}>
          {log.step}
        </span>
      )}
      {/* メッセージ */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--t)', lineHeight: 1.5 }}>
          {log.msg}
        </span>
        {/* 詳細（展開） */}
        {expanded && log.detail && (
          <div style={{
            fontSize: 10, color: 'var(--t2)', marginTop: 2,
            paddingLeft: 8, borderLeft: `2px solid ${color}40`,
            lineHeight: 1.6, wordBreak: 'break-all',
          }}>
            {log.detail}
          </div>
        )}
      </div>
      {/* 詳細インジケーター */}
      {log.detail && (
        <span style={{
          fontSize: 9, color: 'var(--t3)', flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform .2s',
        }}>▾</span>
      )}
    </div>
  )
}
