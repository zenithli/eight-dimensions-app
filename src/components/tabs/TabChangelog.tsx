'use client'

const VERSIONS = [
  {
    ver: 'V7 · Next.js',
    date: '2026/03/17',
    label: '当前版本',
    labelType: 'hot',
    borderColor: 'var(--g)',
    sections: [
      {
        title: '✅ 新增 Added',
        color: 'var(--g)',
        items: [
          'Next.js 14 App Router + TypeScript · 45个文件 / 6,393行',
          'Supabase DB集成 · 6张表 · 分析历史持久化保存',
          '震荡市过滤器 · AppHeader状态徽章（强势/震荡/弱势）',
          '90天走势图 — 价格/MA20乖离/RR比 Canvas图表',
          '自选股池 近3月涨幅列新增',
          '持仓对比排名（涨跌幅/盈亏额/成本价/持股数排序）',
          '历史B分趋势图（点击股票展开）',
          '止损仓位计算器（最大亏损额→最大持股数反算）',
          '批量分析 batchAll（持仓+自选池 全部）',
          '单只更新按钮 ↻（自选股池单只更新）',
          '强制重新分析按钮（忽略缓存）',
          '信号追踪 SignalTrack（3个月后的真实胜率测量）',
          '止损归因分析 StopLossEvent',
        ],
      },
      {
        title: '🔧 修复 Fixed',
        color: 'var(--y)',
        items: [
          '全标签页白天/夜间模式适配（#fff → var(--t) 统一）',
          '股票名称/代码可读性改善（t3→c/t2 青色统一）',
          '切换标签页时分析结果不丢失（display:none 方式）',
          'Supabase接続 Session Pooler IPv4対応',
          'JSON解析错误时的回退处理',
        ],
      },
      {
        title: '📋 当前 Roadmap',
        color: 'var(--c)',
        items: [
          '✅ Step1〜4: 骨架 · 计算 · 设计 · Tab实装',
          '✅ Step5: PostgreSQL DB化',
          '✅ Step6〜7: Vercel/Supabase生产部署',
          '⏳ 3个月稳定运行 → SignalTrack 300条数据后测量真实胜率',
        ],
      },
    ],
  },
  {
    ver: 'V6 · HTML単文件',
    date: '2026/03/15',
    label: '前身版本',
    labelType: 'minor',
    borderColor: 'var(--c)',
    sections: [
      {
        title: '主要功能',
        color: 'var(--c)',
        items: [
          '八维度完整实装 · ⑧乖离铁律 · MA20真实计算',
          'CSV导入（千分位修正 · BOM兼容 · GBK支持）',
          '90天走势图 6层Canvas · 盈亏比R:R · 价格止损线',
          '3+2+1战术方案 · 四大优化方案 · 月度轮换判定',
          '331KB单文件 · 维护困难 → 已迁移至V7',
        ],
      },
    ],
  },
]

export function TabChangelog() {
  return (
    <div style={{ maxWidth: 860, display:'flex', flexDirection:'column', gap:16 }}>
      {VERSIONS.map((v) => (
        <div key={v.ver} style={{
          backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
          borderRadius:10, padding:'18px 22px', position:'relative', overflow:'hidden',
        }}>
          {/* 左ボーダーライン */}
          <div style={{
            position:'absolute', top:0, left:0, bottom:0, width:3,
            borderRadius:'3px 0 0 3px', backgroundColor: v.borderColor,
          }} />

          {/* ヘッダー */}
          <div style={{ display:'flex', alignItems:'center', gap:10,
            marginBottom:14, flexWrap:'wrap' as const }}>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:14, fontWeight:700,
              color:'var(--t)', letterSpacing:1 }}>
              {v.ver}
            </span>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t2)' }}>
              {v.date}
            </span>
            <span style={{
              fontFamily:'IBM Plex Mono', fontSize:8, padding:'2px 8px',
              borderRadius:10, letterSpacing:0.5,
              ...(v.labelType === 'hot'
                ? { background:'rgba(255,140,42,.12)', borderColor:'rgba(255,140,42,.35)',
                    color:'var(--o)', border:'1px solid', fontWeight:700 }
                : { background:'rgba(0,207,255,.1)', borderColor:'rgba(0,207,255,.3)',
                    color:'var(--c)', border:'1px solid' }),
            }}>
              {v.label}
            </span>
          </div>

          {/* セクション */}
          {v.sections.map((sec) => (
            <div key={sec.title} style={{ marginBottom:10 }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, letterSpacing:2,
                color:'var(--t2)', marginBottom:5,
                display:'flex', alignItems:'center', gap:6 }}>
                {sec.title}
                <div style={{ flex:1, height:1, backgroundColor:'var(--bd)' }} />
              </div>
              <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                {sec.items.map((item, i) => (
                  <li key={i} style={{
                    fontSize:11, color:'var(--t2)', lineHeight:1.9,
                    padding:'3px 0 3px 16px', position:'relative',
                    borderBottom:'1px solid rgba(0,180,255,.03)',
                  }}>
                    <span style={{
                      position:'absolute', left:3, color:sec.color, fontWeight:700
                    }}>›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
