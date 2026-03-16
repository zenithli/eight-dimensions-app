'use client'

import { useState } from 'react'
import { Card } from '@/components/shared/Card'

// ── 現在の3+2+1戦術（V6から移植・2026/03/15更新版）
const TACTIC = {
  attack: [
    { code:'000815', name:'美利云',   role:'进攻矛①守势', cost:17.92, stopLoss:16.50,
      note:'⑧乖离偏大→守势。16.50止损不动摇。等MA20乖离<15%再加仓', color:'var(--r)' },
    { code:'601225', name:'陕西煤业', role:'进攻矛②新建', cost:0,     stopLoss:0,
      note:'本周三条件满足后第一步建仓30%。条件：日线收盘>26.5且量比>1.2', color:'var(--c)' },
    { code:'601101', name:'昊华能源', role:'进攻矛③新建', cost:0,     stopLoss:0,
      note:'本周三条件满足后第一步建仓30%。条件：日线收盘>9.3且量比>1.2', color:'var(--c)' },
  ],
  etf: [
    { code:'159326', name:'电网ETF',  role:'ETF盾牌①', cost:2.11, weight:'40%',
      note:'电力基础设施主线，低乖离可持有。目标占比40%', color:'var(--g)' },
    { code:'515220', name:'煤炭ETF',  role:'ETF盾牌②', cost:0,    weight:'20%',
      note:'配合进攻矛煤炭方向。作为行业Beta对冲', color:'var(--g)' },
  ],
  watch: [
    { code:'603606', name:'东方电缆', role:'观察仓', cost:0,
      note:'列入观察，等突破确认信号后评估是否纳入进攻矛' },
  ],
}

const BACKTEST = {
  winRate: 64.7,
  avgReturn: 6.2,
  maxDrawdown: -7.1,
  sharpe: 1.04,
}

const WEEK_PLAN = [
  { day:'周一(3/16)', color:'var(--r)', tasks:[
    '清仓 洛阳钼业 23000股（已计划）',
    '有色ETF 减至40万',
    '确认 美利云 止损16.50 条件单已设置',
  ]},
  { day:'周三(3/18)', color:'var(--c)', tasks:[
    '陕西煤业 — 满足条件时第一步建仓（30%仓位）',
    '昊华能源 — 满足条件时第一步建仓（30%仓位）',
    '电网ETF  — 确认仓位占比40%',
  ]},
  { day:'周五(3/20)', color:'var(--y)', tasks:[
    '月度复盘：各持仓B分重新评估',
    '检查止损执行情况',
    '下周操作计划确认',
  ]},
]

// 仓位シミュレーター
const TOTAL_ASSET = 627.5  // 万元

export function TabTactic() {
  const [activeScheme, setActiveScheme] = useState<'A'|'B'|'C'|'D'>('B')

  type SchemeInfo = { label: string; desc: string; bt: string; current?: boolean }
  const SCHEMES: Record<typeof activeScheme, SchemeInfo> = {
    A: { label:'方案A — 激進成長',  desc:'全仓进攻矛，追求高收益，波动较大。适合牛市初期', bt:'72% 胜率 +9.8% 均收' },
    B: { label:'方案B — 均衡基准',  desc:'3进攻+2ETF+1观察，兼顾攻守。当前执行方案', bt:'64.7% 胜率 +6.2% 均收', current:true },
    C: { label:'方案C — 稳健防守',  desc:'以ETF为主体，减少个股暴露。适合震荡市', bt:'58% 胜率 +3.8% 均收' },
    D: { label:'方案D — 对冲',      desc:'多空配置，通过反向ETF对冲系统风险', bt:'53% 胜率 +2.1% 均收' },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* バックテスト統計 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'BACKTEST 胜率', value:`${BACKTEST.winRate}%`,     color:'var(--g)' },
          { label:'平均收益',       value:`+${BACKTEST.avgReturn}%`,  color:'var(--c)' },
          { label:'最大回撤',       value:`${BACKTEST.maxDrawdown}%`, color:'var(--r)' },
          { label:'夏普比率',       value:BACKTEST.sharpe.toFixed(2), color:'var(--y)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
            borderRadius:10, padding:'12px', textAlign:'center',
          }}>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:22, fontWeight:700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 現在の戦術 */}
      <Card title="3+2+1 TACTIC · 当前执行方案（2026/03/15）">

        {/* 進攻矛×3 */}
        <SectionTitle icon="⚔️" label="进攻矛 × 3" sub="个股持仓，追求超额收益" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
          {TACTIC.attack.map(s => (
            <StockCard key={s.code} {...s} />
          ))}
        </div>

        {/* ETF盾牌×2 */}
        <SectionTitle icon="🛡️" label="ETF盾牌 × 2" sub="行业Beta，降低个股波动" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
          {TACTIC.etf.map(s => (
            <StockCard key={s.code} {...s} />
          ))}
        </div>

        {/* 観察仓×1 */}
        <SectionTitle icon="👁️" label="观察仓 × 1" sub="候补席位，等待信号" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, marginBottom:20 }}>
          {TACTIC.watch.map(s => (
            <StockCard key={s.code} {...s} />
          ))}
        </div>

        {/* 仓位シミュレーター */}
        <SectionTitle icon="📐" label="仓位参考" sub={`总资产 ${TOTAL_ASSET}万元`} />
        <PositionSimulator />
      </Card>

      {/* 週間实行計画 */}
      <Card title="📅 本周执行计划（3/16–3/20）">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {WEEK_PLAN.map(({ day, color, tasks }) => (
            <div key={day} style={{
              backgroundColor:'var(--bg3)', border:`1px solid ${color}22`,
              borderTop:`2px solid ${color}`, borderRadius:8, padding:'12px',
            }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, fontWeight:700, color, marginBottom:8 }}>
                {day}
              </div>
              {tasks.map((t, i) => (
                <div key={i} style={{
                  fontSize:11, color:'var(--t2)',
                  paddingLeft:12, position:'relative', lineHeight:1.9,
                }}>
                  <span style={{ position:'absolute', left:0, color }}>›</span>
                  {t}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      {/* 四方案比較 */}
      <Card title="四大优化方案 · 对比">
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          {(Object.entries(SCHEMES) as [typeof activeScheme, SchemeInfo][]).map(([key, s]) => (
            <button key={key} onClick={() => setActiveScheme(key)}
              style={{
                fontFamily:'IBM Plex Mono', fontSize:10,
                padding:'5px 14px', borderRadius:99, cursor:'pointer',
                border:`1px solid ${activeScheme===key ? 'var(--c)' : 'var(--bd)'}`,
                color: activeScheme===key ? 'var(--c)' : 'var(--t2)',
                backgroundColor: activeScheme===key ? 'rgba(56,200,255,0.1)' : 'transparent',
              }}>
              {s.current ? `★ ${key}` : key}
            </button>
          ))}
        </div>
        <div style={{
          backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
          borderRadius:8, padding:'14px',
        }}>
          <div style={{ fontWeight:700, color:'#fff', fontSize:13, marginBottom:6 }}>
            {SCHEMES[activeScheme].label}
          </div>
          <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.9, marginBottom:8 }}>
            {SCHEMES[activeScheme].desc}
          </div>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--y)' }}>
            {SCHEMES[activeScheme].bt}
          </div>
          {SCHEMES[activeScheme].current && (
            <div style={{
              marginTop:8, display:'inline-block',
              fontFamily:'IBM Plex Mono', fontSize:9,
              padding:'2px 8px', borderRadius:99,
              border:'1px solid rgba(0,232,122,0.4)',
              color:'var(--g)',
            }}>● 当前执行方案</div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── セクションタイトル ──
function SectionTitle({ icon, label, sub }: { icon:string; label:string; sub:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontWeight:700, color:'#fff', fontSize:13 }}>{label}</span>
      <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)' }}>{sub}</span>
    </div>
  )
}

// ── 銘柄カード ──
function StockCard({ code, name, role, cost, note, color }: {
  code:string; name:string; role:string; cost:number; note:string; color?:string; weight?:string; stopLoss?:number
}) {
  return (
    <div style={{
      backgroundColor:'var(--bg3)',
      border:`1px solid ${color ? color+'30' : 'var(--bd)'}`,
      borderLeft:`3px solid ${color || 'var(--bd)'}`,
      borderRadius:8, padding:'12px',
    }}>
      <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color: color || 'var(--t3)', marginBottom:3 }}>
        {code}
      </div>
      <div style={{ fontWeight:700, color:'#fff', fontSize:14, marginBottom:4 }}>{name}</div>
      <div style={{
        fontFamily:'IBM Plex Mono', fontSize:9, display:'inline-block',
        padding:'1px 6px', border:'1px solid var(--bd)', borderRadius:3,
        color:'var(--t3)', marginBottom:8,
      }}>{role}</div>
      {cost > 0 && (
        <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t2)', marginBottom:6 }}>
          成本 ¥{cost}
        </div>
      )}
      <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.8 }}>{note}</div>
    </div>
  )
}

// ── 仓位シミュレーター ──
function PositionSimulator() {
  const [riskPct, setRiskPct] = useState('2')
  const [entry,   setEntry]   = useState('')
  const [stop,    setStop]    = useState('')

  const calc = (() => {
    const r = parseFloat(riskPct), e = parseFloat(entry), s = parseFloat(stop)
    if (!r || !e || !s || e <= s || TOTAL_ASSET <= 0) return null
    const maxLoss = TOTAL_ASSET * 10000 * (r / 100)
    const lossPerShare = e - s
    const shares = Math.floor(maxLoss / lossPerShare / 100) * 100
    if (shares <= 0) return null  // 計算結果が0以下は無効
    const positionAmt = shares * e
    const positionPct = (positionAmt / (TOTAL_ASSET * 10000)) * 100
    return { shares, positionAmt: (positionAmt / 10000).toFixed(1), positionPct: positionPct.toFixed(1), maxLoss: (maxLoss / 10000).toFixed(1) }
  })()

  const inputStyle: React.CSSProperties = {
    backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
    color:'var(--t)', fontFamily:'IBM Plex Mono', fontSize:12,
    padding:'6px 10px', borderRadius:6, outline:'none', width:'100%',
  }

  return (
    <div style={{ backgroundColor:'var(--bg3)', border:'1px solid var(--bd)', borderRadius:8, padding:'14px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
        {[
          { label:'风险比例%', val:riskPct, set:setRiskPct, ph:'2' },
          { label:'买入价格', val:entry,   set:setEntry,   ph:'18.50' },
          { label:'止损价格', val:stop,    set:setStop,    ph:'16.50' },
        ].map(({ label, val, set, ph }) => (
          <div key={label}>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>{label}</div>
            <input style={inputStyle} type="number" placeholder={ph} value={val}
              onChange={e => set(e.target.value)} />
          </div>
        ))}
      </div>
      {calc ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { label:'建议股数',  value:`${calc.shares.toLocaleString()}股`, color:'var(--c)' },
            { label:'建仓金额',  value:`${calc.positionAmt}万`,            color:'var(--c)' },
            { label:'占总资产',  value:`${calc.positionPct}%`,             color:'var(--y)' },
            { label:'最大损失',  value:`${calc.maxLoss}万`,                color:'var(--r)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              backgroundColor:'var(--bg2)', borderRadius:6, padding:'8px', textAlign:'center',
            }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>{label}</div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:13, fontWeight:700, color }}>{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t3)', textAlign:'center', padding:'8px 0' }}>
          输入买入价和止损价后自动计算建议仓位
        </div>
      )}
    </div>
  )
}
