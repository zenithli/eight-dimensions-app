import { type ReactNode } from 'react'

interface CardProps {
  title?:     string
  action?:    ReactNode
  children:   ReactNode
  style?:     React.CSSProperties
}

export function Card({ title, action, children, style }: CardProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg2)',
      border: '1px solid var(--bd)',
      borderRadius: 10,
      overflow: 'hidden',
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--bd)',
        }}>
          {title && (
            <h2 style={{
              fontFamily: 'IBM Plex Mono', fontSize: 10,
              letterSpacing: '0.1em', color: 'var(--t2)', fontWeight: 500,
            }}>
              {title}
            </h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: 16 }}>
        {children}
      </div>
    </div>
  )
}
