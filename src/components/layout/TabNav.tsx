'use client'

import { useState, useEffect } from 'react'

export type TabId =
  | 'analyze' | 'portfolio' | 'compare' | 'alerts'
  | 'pool' | 'tactic' | 'history' | 'changelog'

const TABS = [
  { id: 'analyze'   as TabId, icon: '📊', label: '单股分析'  },
  { id: 'portfolio' as TabId, icon: '📁', label: '我的持仓'  },
  { id: 'compare'   as TabId, icon: '⚖️', label: '多股对比'  },
  { id: 'alerts'    as TabId, icon: '🔔', label: '价格预警'  },
  { id: 'pool'      as TabId, icon: '⭐', label: '自选股池'  },
  { id: 'tactic'    as TabId, icon: '📋', label: '3+2+1方案' },
  { id: 'history'   as TabId, icon: '📅', label: '历史记录'  },
  { id: 'changelog' as TabId, icon: '📦', label: '更新日志', badge: true },
]

interface TabNavProps {
  activeTab: TabId
  onChange:  (id: TabId) => void
}

export function TabNav({ activeTab, onChange }: TabNavProps) {
  const [seen, setSeen] = useState(true)

  useEffect(() => {
    setSeen(!!localStorage.getItem('changelog_seen_v7'))
  }, [])

  function handleClick(id: TabId) {
    onChange(id)
    if (id === 'changelog') {
      localStorage.setItem('changelog_seen_v7', '1')
      setSeen(true)
    }
  }

  return (
    <nav style={{
      display: 'flex', flexWrap: 'wrap',
      borderBottom: '1px solid var(--bd)',
      marginBottom: 0,
    }}>
      {TABS.map(tab => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: 'IBM Plex Mono', fontSize: 11,
              padding: '10px 14px',
              color: active ? 'var(--c)' : 'var(--t2)',
              borderBottom: `2px solid ${active ? 'var(--c)' : 'transparent'}`,
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              marginBottom: -1,
              backgroundColor: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && !seen && (
              <span style={{
                position: 'absolute', top: 6, right: 4,
                width: 6, height: 6, borderRadius: '50%',
                backgroundColor: 'var(--r)',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
