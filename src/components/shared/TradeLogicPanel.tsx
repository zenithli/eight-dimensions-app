'use client'

import { useState } from 'react'
import type { TradeLogic } from '@/types/domain'

interface TradeLogicPanelProps {
  code:      string
  name:      string
  logic?:    TradeLogic
  onSave?:   (code: string, logic: TradeLogic) => Promise<void>
  readonly?: boolean
}

export function TradeLogicPanel({ code, name, logic, onSave, readonly }: TradeLogicPanelProps) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState<TradeLogic>({
    whyBuy:        logic?.whyBuy        ?? '',
    sellCondition: logic?.sellCondition ?? '',
    notSell:       logic?.notSell       ?? '',
  })
  const [saved, setSaved] = useState(false)

  const hasContent = !!(logic?.whyBuy || logic?.sellCondition || logic?.notSell)

  function startEdit() {
    setForm({
      whyBuy:        logic?.whyBuy        ?? '',
      sellCondition: logic?.sellCondition ?? '',
      notSell:       logic?.notSell       ?? '',
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(code, form)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // ── 表示モード ──
  if (!editing) {
    return (
      <div style={{
        backgroundColor: 'var(--bg3)',
        border: '1px solid var(--bd)',
        borderRadius: 8, padding: '12px 14px',
        marginTop: 8,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: hasContent ? 10 : 0,
        }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em' }}>
            持仓理由档案
          </span>
          {!readonly && (
            <button onClick={startEdit} style={{
              fontFamily: 'IBM Plex Mono', fontSize: 9,
              padding: '2px 8px', border: '1px solid var(--bd)',
              borderRadius: 3, color: 'var(--c)',
              backgroundColor: 'transparent', cursor: 'pointer',
            }}>
              {hasContent ? '✏ 编辑' : '+ 添加'}
            </button>
          )}
        </div>

        {hasContent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: '💡 买入理由',   value: logic?.whyBuy,        color: 'var(--g)' },
              { label: '📤 卖出条件',   value: logic?.sellCondition, color: 'var(--r)' },
              { label: '🔒 不因此而卖', value: logic?.notSell,       color: 'var(--y)' },
            ].map(({ label, value, color }) => value ? (
              <div key={label}>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.8 }}>
                  {value}
                </div>
              </div>
            ) : null)}
            {logic?.updatedAt && (
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--t3)', marginTop: 4 }}>
                更新: {new Date(logic.updatedAt).toLocaleDateString('zh-CN')}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            fontSize: 11, color: 'var(--t3)',
            fontStyle: 'italic', textAlign: 'center', padding: '6px 0',
          }}>
            还没有添加持仓理由。点击「+ 添加」记录买入逻辑。
          </div>
        )}
      </div>
    )
  }

  // ── 編集モード ──
  const textareaStyle = {
    width: '100%',
    backgroundColor: 'var(--bg2)',
    border: '1px solid var(--bd)',
    color: 'var(--t)',
    fontFamily: 'Noto Sans SC, sans-serif',
    fontSize: 12,
    padding: '8px 10px',
    borderRadius: 6,
    outline: 'none',
    resize: 'vertical' as const,
    lineHeight: 1.8,
    marginTop: 4,
  }

  const labelStyle = {
    fontFamily: 'IBM Plex Mono',
    fontSize: 10,
    display: 'block',
    marginBottom: 2,
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg3)',
      border: '1px solid var(--c)',
      borderRadius: 8, padding: '14px',
      marginTop: 8,
    }}>
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--c)', letterSpacing: '0.1em', marginBottom: 12 }}>
        ✏ 编辑持仓理由 — {name}（{code}）
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ ...labelStyle, color: 'var(--g)' }}>💡 买入理由</label>
          <textarea
            rows={3}
            placeholder="为什么买这只股票？趋势/板块/基本面等"
            value={form.whyBuy}
            onChange={e => setForm(f => ({ ...f, whyBuy: e.target.value }))}
            style={textareaStyle}
          />
        </div>

        <div>
          <label style={{ ...labelStyle, color: 'var(--r)' }}>📤 卖出条件</label>
          <textarea
            rows={2}
            placeholder="什么情况下会卖？B分<3.5 / 跌破止损 / 目标价到达等"
            value={form.sellCondition}
            onChange={e => setForm(f => ({ ...f, sellCondition: e.target.value }))}
            style={textareaStyle}
          />
        </div>

        <div>
          <label style={{ ...labelStyle, color: 'var(--y)' }}>🔒 不因此而卖</label>
          <textarea
            rows={2}
            placeholder="哪些情况不会卖？短期波动/大盘下跌/消息面扰动等"
            value={form.notSell}
            onChange={e => setForm(f => ({ ...f, notSell: e.target.value }))}
            style={textareaStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={() => setEditing(false)} style={{
          fontFamily: 'IBM Plex Mono', fontSize: 11,
          padding: '6px 16px', border: '1px solid var(--bd)',
          borderRadius: 5, color: 'var(--t2)',
          backgroundColor: 'transparent', cursor: 'pointer',
        }}>
          取消
        </button>
        <button onClick={handleSave} disabled={saving} style={{
          fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 700,
          padding: '6px 20px', border: 'none',
          borderRadius: 5, cursor: saving ? 'not-allowed' : 'pointer',
          backgroundColor: saved ? 'var(--g)' : 'var(--c)',
          color: '#000', opacity: saving ? 0.7 : 1,
          transition: 'all .2s',
        }}>
          {saving ? '保存中…' : saved ? '✓ 已保存' : '保存'}
        </button>
      </div>
    </div>
  )
}
