'use client'

import { Card } from '@/components/shared/Card'

const VERSIONS = [
  {
    ver: 'V7 · Next.js',
    date: '2026/03',
    label: '当前版本',
    labelColor: 'var(--g)',
    borderColor: 'var(--g)',
    items: [
      { done: true,  text: '项目骨架 — Next.js 14 App Router + TypeScript' },
      { done: true,  text: '核心计算库 — lib/core 纯函数，无DOM依赖，26项自测通过' },
      { done: true,  text: '类型系统 — types/domain + types/api 前后端契约' },
      { done: true,  text: '设计系统 — 全面インラインスタイル，CSS变量，无Tailwind类依赖' },
      { done: true,  text: 'API Routes — /api/analyze · /api/quote · /api/ma20 · /api/portfolio/import' },
      { done: true,  text: '单股分析 Tab — AI分析 + 八维度スコアバー + 快速選択ボタン' },
      { done: true,  text: '自选股池 Tab — B分表格 + MA20乖离 + 实时更新 + 来源标签' },
      { done: true,  text: '持仓面板 Tab — CSV导入弹窗 + diff预览 + 合并不删除旧数据' },
      { done: false, text: '多股对比 / 价格预警 / 3+2+1 / 历史记录 — 迁移中 (Step 7)' },
      { done: false, text: 'PostgreSQL — 数据持久化 (Step 5)' },
    ],
  },
  {
    ver: 'V6 · HTML单文件',
    date: '2026/03/15',
    label: '前身版本',
    labelColor: 'var(--t3)',
    borderColor: 'var(--bd)',
    items: [
      { done: true, text: '八维度完整实现 · ⑧乖离铁律 · MA20真实计算' },
      { done: true, text: 'CSV导入（千分位修正・BOM对応・GBK兼容）' },
      { done: true, text: '90天走势图 6层Canvas · 盈亏比R:R · 价格止损线' },
      { done: true, text: '3+2+1战术方案 · 四大优化方案 · 月度轮换判定' },
      { done: true, text: '更新日志 Tab · 待优化项目路线图' },
      { done: false, text: '331KB单文件・6393行・维护困难 → 迁移到V7' },
    ],
  },
]

export function TabChangelog() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {VERSIONS.map((v: typeof VERSIONS[0]) => (
        <div key={v.ver} style={{
          position:'relative',
          backgroundColor:'var(--bg2)',
          border:'1px solid var(--bd)',
          borderLeft:`3px solid ${v.borderColor}`,
          borderRadius:10, padding:20,
        }}>
          {/* ヘッダー */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:15, fontWeight:700, color:'#fff' }}>
              {v.ver}
            </span>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t3)' }}>
              {v.date}
            </span>
            <span style={{
              fontFamily:'IBM Plex Mono', fontSize:9, padding:'2px 8px',
              border:`1px solid ${v.labelColor}`, borderRadius:99,
              color: v.labelColor, backgroundColor:`${v.labelColor}12`,
            }}>
              {v.label}
            </span>
          </div>
          {/* 項目リスト */}
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {v.items.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{
                  flexShrink:0, marginTop:2,
                  color: item.done ? 'var(--g)' : 'var(--t3)',
                  fontFamily:'IBM Plex Mono', fontSize:11,
                }}>
                  {item.done ? '✅' : '🚧'}
                </span>
                <span style={{
                  fontSize:12, color: item.done ? 'var(--t2)' : 'var(--t3)',
                  lineHeight:1.7,
                }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ロードマップ */}
      <Card title="ROADMAP · 迁移路线图">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { phase:'完成', color:'var(--g)', items:['Step1 骨架','Step2 核心計算库','Step3 类型契约','Step4 主要Tab'] },
            { phase:'进行中', color:'var(--y)', items:['Step5 PostgreSQL Schema','Step6 API Routes完成','Step7 其余Tab迁移'] },
            { phase:'待定', color:'var(--t3)', items:['Step8 部署 Vercel/Supabase','多用户支持','Python回测引擎'] },
          ].map(({ phase, color, items }) => (
            <div key={phase} style={{
              backgroundColor:'var(--bg3)',
              border:`1px solid ${color}22`,
              borderTop:`2px solid ${color}`,
              borderRadius:8, padding:'12px 14px',
            }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color, letterSpacing:'0.1em', marginBottom:8 }}>
                {phase}
              </div>
              {items.map((item, i) => (
                <div key={i} style={{
                  fontSize:11, color:'var(--t2)',
                  lineHeight:1.9, paddingLeft:10, position:'relative',
                }}>
                  <span style={{ position:'absolute', left:0, color }}>›</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
