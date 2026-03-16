'use client'

import { useState, useEffect } from 'react'
import { AppHeader } from './AppHeader'
import { TabNav, type TabId } from './TabNav'
import { TabAnalyze }   from '@/components/tabs/TabAnalyze'
import { TabPortfolio } from '@/components/tabs/TabPortfolio'
import { TabCompare }   from '@/components/tabs/TabCompare'
import { TabAlerts }    from '@/components/tabs/TabAlerts'
import { TabPool }      from '@/components/tabs/TabPool'
import { TabTactic }    from '@/components/tabs/TabTactic'
import { TabHistory }   from '@/components/tabs/TabHistory'
import { TabChangelog } from '@/components/tabs/TabChangelog'
import { LogPanel }    from '@/components/shared/LogPanel'

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('analyze')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('qts_theme') || 'dark') as 'dark' | 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('qts_theme', next)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* トップグラデーションライン */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 50,
        background: 'linear-gradient(90deg, var(--r) 0%, var(--y) 35%, var(--g) 70%, var(--c) 100%)',
      }} />

      <AppHeader theme={theme} onToggleTheme={toggleTheme} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 16px 64px' }}>
        <TabNav activeTab={activeTab} onChange={setActiveTab} />
        <div style={{ marginTop: 12 }}>
          {/* display:noneで非表示（アンマウントしないのでstateが保持される） */}
          <div style={{ display: activeTab === 'analyze'   ? 'block' : 'none' }}><TabAnalyze /></div>
          <div style={{ display: activeTab === 'portfolio' ? 'block' : 'none' }}><TabPortfolio /></div>
          <div style={{ display: activeTab === 'compare'   ? 'block' : 'none' }}><TabCompare /></div>
          <div style={{ display: activeTab === 'alerts'    ? 'block' : 'none' }}><TabAlerts /></div>
          <div style={{ display: activeTab === 'pool'      ? 'block' : 'none' }}><TabPool /></div>
          <div style={{ display: activeTab === 'tactic'    ? 'block' : 'none' }}><TabTactic /></div>
          <div style={{ display: activeTab === 'history'   ? 'block' : 'none' }}><TabHistory /></div>
          <div style={{ display: activeTab === 'changelog' ? 'block' : 'none' }}><TabChangelog /></div>
        </div>
      </div>

      {/* ── ログパネル（画面下部固定）── */}
      <LogPanel />
    </div>
  )
}
