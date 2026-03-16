'use client'

import { useState, useEffect } from 'react'
import { cstNow, cstDateSlash, cstHHMM, isTradeOpen } from '@/lib/core/time'

interface AppHeaderProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function AppHeader({ theme, onToggleTheme }: AppHeaderProps) {
  const [timeStr, setTimeStr]   = useState('')
  const [tradeOpen, setTradeOpen] = useState(false)
  const [apiKey, setApiKey]     = useState('')
  const [keySaved, setKeySaved] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('qtkey') || ''
    setApiKey(saved)
    setKeySaved(!!saved)
  }, [])

  useEffect(() => {
    function tick() {
      const now = cstNow()
      setTimeStr(`${cstDateSlash(now)} ${cstHHMM(now)} 北京时间`)
      setTradeOpen(isTradeOpen(now))
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  function saveKey() {
    const k = apiKey.trim()
    if (!k) return
    localStorage.setItem('qtkey', k)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  const S = {
    header: {
      borderBottom: '1px solid var(--bd)',
      backgroundColor: 'var(--bg2)',
      position: 'sticky' as const,
      top: 0,
      zIndex: 40,
    },
    inner: {
      maxWidth: 1280,
      margin: '0 auto',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap' as const,
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginRight: 16,
    },
    logoBox: {
      width: 36, height: 36,
      border: '1px solid rgba(56,200,255,0.4)',
      borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    logoText: { color: 'var(--c)', fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 700 },
    brandName: { color: 'var(--t)', fontWeight: 700, fontSize: 13 },
    brandSub: { color: 'var(--t3)', fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.15em' },
    keyRow: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, maxWidth: 480 },
    keyLabel: { color: 'var(--t3)', fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.12em', whiteSpace: 'nowrap' as const },
    keyInput: {
      flex: 1,
      backgroundColor: 'var(--bg3)',
      border: '1px solid var(--bd)',
      color: 'var(--t)',
      fontFamily: 'IBM Plex Mono',
      fontSize: 11,
      padding: '6px 10px',
      borderRadius: 6,
      outline: 'none',
    },
    saveBtn: {
      fontSize: 10, fontFamily: 'IBM Plex Mono',
      padding: '5px 12px',
      border: '1px solid var(--bd)',
      borderRadius: 6,
      color: 'var(--t2)',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
    },
    right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
    tradeBadge: (open: boolean) => ({
      fontFamily: 'IBM Plex Mono', fontSize: 10,
      padding: '4px 10px',
      border: `1px solid ${open ? 'rgba(0,232,122,0.4)' : 'var(--bd)'}`,
      borderRadius: 4,
      color: open ? 'var(--g)' : 'var(--t3)',
      backgroundColor: open ? 'rgba(0,232,122,0.06)' : 'transparent',
    }),
    timeBadge: {
      fontFamily: 'IBM Plex Mono', fontSize: 10,
      color: 'var(--t2)', border: '1px solid var(--bd)',
      padding: '4px 10px', borderRadius: 4,
    },
    verBadge: {
      fontFamily: 'IBM Plex Mono', fontSize: 10,
      color: 'var(--c)', border: '1px solid rgba(56,200,255,0.35)',
      padding: '4px 10px', borderRadius: 4,
    },
    themeBtn: {
      width: 30, height: 30,
      border: '1px solid var(--bd)', borderRadius: 6,
      backgroundColor: 'transparent',
      color: 'var(--t2)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14,
    },
  }

  return (
    <header style={S.header}>
      <div style={S.inner}>
        {/* ロゴ */}
        <div style={S.logo}>
          <div style={S.logoBox}>
            <span style={S.logoText}>8D</span>
          </div>
          <div>
            <div style={S.brandName}>八维度量化交易系统</div>
            <div style={S.brandSub}>EIGHT DIMENSIONS · V7 · 含⑧乖离率维度</div>
          </div>
        </div>

        {/* API Key */}
        <div style={S.keyRow}>
          <span style={S.keyLabel}>ANTHROPIC API KEY</span>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveKey()}
            placeholder="sk-ant-..."
            style={S.keyInput}
          />
          <button onClick={saveKey} style={S.saveBtn}>
            {keySaved ? '✓ 已保存' : '保存'}
          </button>
        </div>

        {/* 右側 */}
        <div style={S.right}>
          <div style={S.tradeBadge(tradeOpen)}>
            {tradeOpen ? '● 交易中' : '○ 休市'}
          </div>
          <div style={S.timeBadge}>{timeStr}</div>
          <div style={S.verBadge}>V7 · Next.js</div>
          <button onClick={onToggleTheme} style={S.themeBtn} title="切换主题">
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}
