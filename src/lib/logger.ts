/**
 * src/lib/logger.ts
 *
 * クライアントサイドログシステム
 * V6 の L() / _renderLog() を React 対応版に移植
 *
 * 使い方:
 *   import { useLogger } from '@/lib/logger'
 *   const { L, logs } = useLogger()
 *   L('行情取得完了', 'ok', '¥18.84', 'quote')
 */

export type LogLevel = 'ok' | 'info' | 'warn' | 'error' | 'step' | 'api'

export interface LogEntry {
  id:      string
  ts:      string    // HH:MM:SS
  level:   LogLevel
  msg:     string
  detail?: string
  step?:   string
}

const MAX_LOGS = 200

// グローバルログストア（コンポーネント間で共有）
let _logs: LogEntry[] = []
let _listeners: Array<(logs: LogEntry[]) => void> = []

function notify() {
  const copy = [..._logs]
  _listeners.forEach(fn => fn(copy))
}

export function addLog(
  msg: string,
  level: LogLevel = 'info',
  detail?: string,
  step?: string
): void {
  const now = new Date()
  // UTC→CST(+8)
  const cst = new Date(now.getTime() + 8 * 3600000)
  const ts = `${String(cst.getUTCHours()).padStart(2,'0')}:${String(cst.getUTCMinutes()).padStart(2,'0')}:${String(cst.getUTCSeconds()).padStart(2,'0')}`

  const entry: LogEntry = {
    id:     `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    ts,
    level,
    msg,
    detail,
    step,
  }

  _logs = [entry, ..._logs].slice(0, MAX_LOGS)
  notify()

  // 開発環境ではコンソールにも出力
  if (process.env.NODE_ENV === 'development') {
    const icon = { ok:'✅', info:'ℹ️', warn:'⚠️', error:'❌', step:'→', api:'🌐' }[level]
    console.log(`[${ts}] ${icon} ${msg}${detail ? ` | ${detail}` : ''}`)
  }
}

export function clearLogs(): void {
  _logs = []
  notify()
}

export function getLogs(): LogEntry[] {
  return [..._logs]
}

// React Hook
// Note: このファイルは 'use client' コンポーネントからのみ import すること
import { useState as _useState, useEffect as _useEffect } from 'react'

export function useLogger(): { L: typeof addLog; logs: LogEntry[]; clear: typeof clearLogs } {
  const [logs, setLogs] = _useState<LogEntry[]>([..._logs])

  _useEffect(() => {
    setLogs([..._logs])
    _listeners.push(setLogs)
    return () => {
      _listeners = _listeners.filter((fn: (logs: LogEntry[]) => void) => fn !== setLogs)
    }
  }, [])

  return { L: addLog, logs, clear: clearLogs }
}
