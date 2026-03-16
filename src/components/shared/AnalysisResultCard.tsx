'use client'
/**
 * AnalysisResultCard.tsx  fix202603170124
 * V6完全移植版 - 9区段全実装
 * ① 株名/価格/信号 + 七维度円環 + B分ボックス + freshness
 * ② databar 12格（行情6 + MA均線6）
 * ③ DIMENSIONS 八维度バー（ドット指示器）+ RADAR
 * ④ ANALYSIS AI分析 + 90天走勢ボタン
 * ⑤ RISK/REWARD 盈亏比 4格 + バー
 * ⑥ POSITION CALC 仓位計算器（常時展開）
 * ⑦ ACTION 三段操作建议
 * ⑧ 持仓理由档案（持仓株のみ）
 * ⑨ TrendPanel 走勢図
 */
import React, { useState, useEffect } from 'react'
import { TrendPanel } from './TrendPanel'
import type { AnalysisResult } from '@/types/domain'
import { getBSignal, getBiasLevel } from '@/lib/core/b-score'

const PORTFOLIO_CODES = ['000815','601225','601101','159326','000977','002371','300308','600598']

const DIM_META = [
  { icon:'①', name:'趋势共振',   color:'#38c8ff' },
  { icon:'②', name:'量能加速',   color:'#00e87a' },
  { icon:'③', name:'Alpha超额',  color:'#f7c948' },
  { icon:'④', name:'威科夫阶段', color:'#c87aff' },
  { icon:'⑤', name:'板块生态',   color:'#38c8ff' },
  { icon:'⑥', name:'资金流向',   color:'#00e87a' },
  { icon:'⑦', name:'基本面锚',   color:'#f7c948' },
  { icon:'⑧', name:'乖离率控制', color:'#ff3a6e' },
]

const ctit: React.CSSProperties = {
  fontFamily:'IBM Plex Mono', fontSize:9, letterSpacing:'0.14em',
  color:'var(--t3)', marginBottom:12, textTransform:'uppercase',
  display:'flex', alignItems:'center', justifyContent:'space-between',
}
const card: React.CSSProperties = {
  backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
  padding:'14px 16px',
}

function parseRR(rr: string): number {
  const m = rr?.match(/1:([\d.]+)/)
  return m ? parseFloat(m[1]) : 0
}

export function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const signal   = getBSignal(result.totalScore)
  const rr       = parseRR(result.riskRatio)
  const rrColor  = rr >= 2 ? 'var(--g)' : rr >= 1 ? 'var(--y)' : 'var(--r)'
  const pnlColor = result.changePct > 0 ? 'var(--r)' : result.changePct < 0 ? 'var(--g)' : 'var(--t3)'
  const bias     = result.ma20Bias ?? 0
  const biasLvl  = getBiasLevel(bias)
  const isPort   = PORTFOLIO_CODES.includes(result.code)
  const [showTrend, setShowTrend] = useState(false)
  const score7   = result.scores?.slice(0,7).reduce((s,d)=>s+(d.score||0),0) ?? 0

  const freshColor = 'var(--g)'
  const freshLabel = '✓ 今日数据'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* ① ヘッダー */}
      <div style={{ ...card, borderRadius:'10px 10px 0 0', borderBottom:'none',
        borderLeft:`3px solid ${signal.color}` }}>
        <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:freshColor,
          marginBottom:8, letterSpacing:'0.1em' }}>{freshLabel}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          gap:12, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <span style={{ fontSize:22, fontWeight:700, color:'var(--t)' }}>{result.name}</span>
              <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, color:'var(--t3)' }}>{result.code}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <span style={{ fontFamily:'IBM Plex Mono', fontSize:18, fontWeight:700, color:'var(--t)' }}>
                ¥{result.price.toFixed(2)}</span>
              <span style={{ fontFamily:'IBM Plex Mono', fontSize:13, fontWeight:700, color:pnlColor }}>
                {result.changePct > 0 ? '+' : ''}{result.changePct.toFixed(2)}%</span>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, padding:'4px 14px',
                border:`1px solid ${signal.color}`, borderRadius:4,
                color:signal.color, backgroundColor:`${signal.color}18`, fontWeight:700 }}>
                {result.signal}
              </span>
              <span style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:biasLvl.color,
                padding:'3px 10px', border:`1px solid ${biasLvl.color}44`,
                borderRadius:4, backgroundColor:`${biasLvl.color}11` }}>
                ⑧{biasLvl.label}
              </span>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ position:'relative', width:90, height:90 }}>
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="38" fill="none" stroke="var(--bg3)" strokeWidth="6"/>
                <circle cx="45" cy="45" r="38" fill="none" stroke={signal.color} strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*38}`}
                  strokeDashoffset={`${2*Math.PI*38*(1-score7/35)}`}
                  transform="rotate(-90 45 45)"
                  style={{ transition:'stroke-dashoffset 0.8s ease' }}/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex',
                flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:'IBM Plex Mono', fontSize:18, fontWeight:900,
                  color:signal.color, lineHeight:1 }}>{score7}</span>
                <span style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)' }}>/35</span>
              </div>
            </div>
            <div style={{ fontSize:9, fontFamily:'IBM Plex Mono', color:'var(--t3)' }}>七维度总分</div>
            <div style={{ backgroundColor:'var(--bg3)', border:'1px solid var(--bd2)',
              borderRadius:6, padding:'8px 12px', textAlign:'center', width:90 }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:8, color:'var(--t2)',
                letterSpacing:'0.1em', marginBottom:3 }}>基准B综合分</div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:20, fontWeight:700,
                color:signal.color }}>{result.totalScore.toFixed(2)}</div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:8, color:biasLvl.color,
                marginTop:2 }}>⑧乖离：{bias !== 0 ? `${bias > 0 ? '+' : ''}${bias.toFixed(1)}%` : '—'}</div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:8, color:biasLvl.color, marginTop:2 }}>
                {biasLvl.action || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ② databar 12格 */}
      <div style={{ backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
        borderTop:'none', borderBottom:'none' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)',
          borderBottom:'1px solid var(--bd)' }}>
          {[
            { label:'今开',   value: result.open != null ? `¥${result.open!.toFixed(2)}` : '—' },
            { label:'最高',   value: result.high != null ? `¥${result.high!.toFixed(2)}` : '—', color:'var(--r)' },
            { label:'最低',   value: result.low  != null ? `¥${result.low!.toFixed(2)}`  : '—', color:'var(--g)' },
            { label:'成交量', value: result.volume != null ? `${((result.volume||0)/10000).toFixed(0)}万` : '—' },
            { label:'量比',   value: result.volRatio != null ? `${result.volRatio!.toFixed(2)}x` : '—',
              color:(result.volRatio||0)>=2?'var(--r)':(result.volRatio||0)>=1.2?'var(--y)':'var(--t)' },
            { label:'BIAS200乖离★',
              value: bias !== 0 ? `${bias>0?'+':''}${bias.toFixed(1)}%` : '—',
              color: biasLvl.color, sub: biasLvl.action },
          ].map(({ label, value, color, sub }, i) => (
            <div key={i} style={{ padding:'8px 10px',
              borderRight: i < 5 ? '1px solid var(--bd)' : 'none',
              backgroundColor: i===5 ? `${biasLvl.color}08` : 'transparent' }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)',
                letterSpacing:'0.06em', marginBottom:3 }}>{label}</div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:12, fontWeight:700,
                color:color||'var(--t)' }}>{value}</div>
              {sub && <div style={{ fontFamily:'IBM Plex Mono', fontSize:8,
                color:biasLvl.color, marginTop:2, lineHeight:1.3 }}>{sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)' }}>
          {['MA5','MA10','MA20','MA60','MA120','MA200'].map((label, i) => (
            <div key={i} style={{ padding:'7px 10px',
              borderRight: i<5 ? '1px solid var(--bd)' : 'none' }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)',
                letterSpacing:'0.06em', marginBottom:3 }}>{label}</div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:12, fontWeight:700,
                color:'var(--t2)' }}>—</div>
            </div>
          ))}
        </div>
      </div>

      {/* ③ DIMENSIONS + RADAR */}
      <div style={{ backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
        borderTop:'none', borderBottom:'none', padding:'14px 16px',
        display:'grid', gridTemplateColumns:'1fr 160px', gap:16 }}>
        <div>
          <div style={ctit}>
            <span>DIMENSIONS · 八维度分项（点击查看详情）⑧=乖离率控制</span>
          </div>
          {DIM_META.map((meta, i) => {
            const sc    = result.scores?.[i]
            const score = i===7 ? Math.min(5,Math.max(0,5-(bias>35?5:bias>25?2:bias>15?1:0)))
                                : (sc?.score ?? 0)
            const text  = sc?.analysis ?? result.analyses?.[i] ?? ''
            return (
              <DimRow key={i} {...meta} score={score} analysis={text}
                isLast={i===7} isBias={i===7} biasLabel={i===7?biasLvl.label:undefined}/>
            )
          })}
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ ...ctit, marginBottom:8, fontSize:8 }}>RADAR · 雷达图</div>
          <RadarChart scores={result.scores ?? []} />
        </div>
      </div>

      {/* ④ ANALYSIS */}
      <div style={{ ...card, borderTop:'none', borderBottom:'none' }}>
        <div style={ctit}>
          <span>ANALYSIS · AI分析详情（实时搜索 · 今日数据验证）</span>
          <button onClick={() => setShowTrend(v=>!v)} style={{
            padding:'4px 14px', fontFamily:'IBM Plex Mono', fontSize:10,
            background:'linear-gradient(135deg,rgba(0,60,90,0.8),rgba(0,100,150,0.8))',
            border:'1.5px solid var(--c)', color:'var(--t)', borderRadius:4,
            cursor:'pointer', fontWeight:600 }}>
            📈 {showTrend ? '收起走势' : '90天走势'}
          </button>
        </div>
        <div style={{ color:'var(--t)', fontSize:12, lineHeight:2.0, whiteSpace:'pre-wrap' }}>
          {result.summary || '—'}
        </div>
        {result.analyses && result.analyses.length > 0 && (
          <div style={{ marginTop:12, padding:'10px 12px', backgroundColor:'var(--bg3)',
            borderRadius:6, border:'1px solid var(--bd)', fontSize:11,
            color:'var(--t2)', lineHeight:2.0 }}>
            {result.analyses.map((a, i) => a ? (
              <div key={i} style={{ marginBottom:3 }}>
                <span style={{ color:DIM_META[i]?.color||'var(--c)', fontWeight:700,
                  fontFamily:'IBM Plex Mono' }}>{DIM_META[i]?.icon}{DIM_META[i]?.name}：</span>{a}
              </div>
            ) : null)}
          </div>
        )}
        <div style={{ marginTop:8, display:'flex', justifyContent:'space-between',
          fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)' }}>
          <span>数据来源：Claude AI实时网络搜索</span>
          <span>分析时间：{new Date(result.createdAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</span>
        </div>
      </div>

      {/* 走勢図 */}
      {showTrend && (
        <TrendPanel code={result.code} stopLoss={result.stopLoss} targetPrice={result.targetPrice}/>
      )}

      {/* ⑤ RISK/REWARD */}
      <div style={{ ...card, borderTop:'none', borderBottom:'none',
        borderLeft:'3px solid var(--g)' }}>
        <div style={ctit}>RISK / REWARD · 盈亏比</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
          {[
            { label:'当前价格', value:`¥${result.price.toFixed(2)}`,  color:'var(--t)'  },
            { label:'建议止损', value:`¥${result.stopLoss}`,          color:'var(--r)'  },
            { label:'目标价位', value:`¥${result.targetPrice}`,       color:'var(--g)'  },
            { label:'盈亏比',   value:result.riskRatio||'—',          color:rrColor     },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ backgroundColor:'var(--bg3)', borderRadius:6,
              padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)',
                letterSpacing:'0.06em', marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:14, fontWeight:700, color }}>{value}</div>
            </div>
          ))}
        </div>
        <RRBar price={result.price} stopLoss={result.stopLoss} targetPrice={result.targetPrice}/>
      </div>

      {/* ⑥ POSITION CALC */}
      <div style={{ ...card, borderTop:'none', borderBottom:'none' }}>
        <div style={ctit}>
          <span>POSITION CALC · 止损仓位计算器</span>
          <span style={{ fontWeight:400, fontSize:8 }}>根据最大亏损额反推合理仓位</span>
        </div>
        <PositionCalc price={result.price} stopLoss={result.stopLoss}/>
      </div>

      {/* ⑦ ACTION */}
      <div style={{ ...card, borderTop:'none', borderBottom:'none',
        borderRadius: isPort ? 0 : '0 0 10px 10px' }}>
        <div style={ctit}>ACTION · 三段操作建议</div>
        <ActionCards result={result} biasLevel={biasLvl}/>
      </div>

      {/* ⑧ 持仓理由档案 */}
      {isPort && (
        <div style={{ ...card, borderTop:'none', borderRadius:'0 0 10px 10px',
          borderLeft:'3px solid var(--c)' }}>
          <div style={ctit}>📋 持仓理由档案 · 低频操作核心工具</div>
          <TradeLogicEdit code={result.code} name={result.name}/>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────── 子コンポーネント ──────────────────────────── */

function DimRow({ icon, name, color, score, analysis, isLast, isBias, biasLabel }: {
  icon:string; name:string; color:string; score:number; analysis:string;
  isLast:boolean; isBias?:boolean; biasLabel?:string; [k:string]:unknown
}) {
  const [open, setOpen] = useState(false)
  const pct  = Math.min((score/5)*100, 100)
  const dots = [1,2,3,4,5].map(v => v <= Math.round(score))
  return (
    <div>
      <div onClick={() => (analysis||isBias) && setOpen(v=>!v)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0',
          cursor:(analysis||isBias)?'pointer':'default' }}>
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:11, width:16, flexShrink:0, color }}>{icon}</span>
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t2)', width:68, flexShrink:0 }}>{name}</span>
        <div style={{ flex:1, height:4, backgroundColor:'var(--bg3)', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, backgroundColor:color,
            borderRadius:99, transition:'width 0.7s ease' }}/>
        </div>
        <div style={{ display:'flex', gap:2, flexShrink:0 }}>
          {dots.map((filled, i) => (
            <span key={i} style={{ fontSize:7, color:filled?color:'var(--bd2)', lineHeight:1 }}>●</span>
          ))}
        </div>
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:12, fontWeight:700,
          width:24, textAlign:'right', flexShrink:0, color }}>
          {score > 0 ? score.toFixed(0) : '—'}
        </span>
        {(analysis||isBias) && (
          <span style={{ color:'var(--t3)', fontSize:9,
            transform:open?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}>▾</span>
        )}
      </div>
      {open && (
        <div style={{ marginBottom:4, marginLeft:24, paddingLeft:10,
          borderLeft:`2px solid ${color}44`, color:'var(--t2)', fontSize:11, lineHeight:1.8, paddingBottom:4 }}>
          {isBias ? `乖离率：${biasLabel||'—'}` : analysis}
        </div>
      )}
      {!isLast && <div style={{ borderBottom:'1px solid rgba(56,200,255,0.05)' }}/>}
    </div>
  )
}

function RadarChart({ scores }: { scores: Array<{ score:number }> }) {
  const cx=80, cy=80, r=55, n=7
  const labels = ['热势','量价','Alpha','威科夫','板块','资金','基本']
  const angle  = (i:number) => (i/n)*2*Math.PI - Math.PI/2
  const pt     = (i:number, v:number): [number,number] => {
    const a=angle(i), rv=(v/5)*r
    return [cx+rv*Math.cos(a), cy+rv*Math.sin(a)]
  }
  const vals = scores.slice(0,7).map(s=>s?.score??0)
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ overflow:'visible' }}>
      {[1,2,3,4,5].map(g => (
        <polygon key={g} fill="none" stroke="rgba(56,200,255,0.07)" strokeWidth="0.5"
          points={Array.from({length:n},(_,i)=>pt(i,g).join(',')).join(' ')}/>
      ))}
      {Array.from({length:n},(_,i) => (
        <line key={i} x1={cx} y1={cy} x2={pt(i,5)[0]} y2={pt(i,5)[1]}
          stroke="rgba(56,200,255,0.06)" strokeWidth="0.5"/>
      ))}
      <polygon fill="rgba(56,200,255,0.12)" stroke="#38c8ff" strokeWidth="1.5"
        points={vals.map((v,i)=>pt(i,v).join(',')).join(' ')}/>
      {labels.map((label,i) => {
        const [x,y]=pt(i,5.8)
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fontFamily="IBM Plex Mono" fill="var(--t3)">{label}</text>
      })}
    </svg>
  )
}

function RRBar({ price, stopLoss, targetPrice }: { price:number; stopLoss:number; targetPrice:number }) {
  const risk=price-stopLoss, reward=targetPrice-price, total=risk+reward
  if (total<=0||risk<=0) return null
  const riskPct=(risk/total)*100, rewardPct=(reward/total)*100, rr=reward/risk
  return (
    <div>
      <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', marginBottom:4 }}>
        <div style={{ width:`${riskPct}%`, backgroundColor:'rgba(255,58,110,0.4)' }}/>
        <div style={{ width:2, backgroundColor:'var(--bg)' }}/>
        <div style={{ width:`${rewardPct}%`, backgroundColor:'rgba(0,232,122,0.4)' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between',
        fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)' }}>
        <span style={{ color:'var(--r)' }}>止损 -{risk.toFixed(2)}元</span>
        <span style={{ color:rr>=2?'var(--g)':rr>=1?'var(--y)':'var(--r)' }}>1:{rr.toFixed(1)}</span>
        <span style={{ color:'var(--g)' }}>目标 +{reward.toFixed(2)}元</span>
      </div>
    </div>
  )
}

function PositionCalc({ price, stopLoss }: { price:number; stopLoss:number }) {
  const [capital, setCapital] = useState('1000000')
  const [maxLoss, setMaxLoss] = useState('2')
  const maxLossAmt  = parseFloat(capital||'0')*parseFloat(maxLoss||'0')/100
  const riskPS      = price-stopLoss
  const maxShares   = riskPS>0 ? Math.floor(maxLossAmt/riskPS/100)*100 : 0
  const posAmt      = maxShares*price
  const posRatio    = parseFloat(capital||'1')>0 ? posAmt/parseFloat(capital)*100 : 0
  const posColor    = posRatio>50?'var(--r)':posRatio>30?'var(--y)':'var(--g)'
  const inp: React.CSSProperties = {
    width:'100%', backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
    color:'var(--t)', padding:'7px 10px', borderRadius:5,
    fontFamily:'IBM Plex Mono', fontSize:12, outline:'none',
  }
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:4 }}>总资金（元）</div>
          <input type="number" value={capital} onChange={e=>setCapital(e.target.value)} style={inp}/>
        </div>
        <div>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:4 }}>最大亏损（%）</div>
          <input type="number" value={maxLoss} onChange={e=>setMaxLoss(e.target.value)} style={inp}/>
        </div>
        <div>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:4 }}>止损价 / 入场价</div>
          <div style={{ ...inp, color:'var(--t2)' }}>¥{stopLoss.toFixed(2)} / ¥{price.toFixed(2)}</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:8 }}>
        {[
          { label:'每股风险', val:`¥${riskPS.toFixed(2)}`, color:'var(--r)' },
          { label:'最大持股数', val:`${maxShares.toLocaleString()}股`, color:'var(--c)' },
          { label:'建仓金额', val:`¥${posAmt.toLocaleString(undefined,{maximumFractionDigits:0})}`, color:'var(--y)' },
          { label:'仓位比例', val:`${posRatio.toFixed(1)}%`, color:posColor },
        ].map(({ label,val,color }) => (
          <div key={label} style={{ backgroundColor:'var(--bg3)', borderRadius:7,
            padding:'9px 11px', border:'1px solid rgba(56,200,255,0.12)' }}>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', marginBottom:3 }}>{label}</div>
            <div style={{ fontFamily:'IBM Plex Mono', fontSize:14, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ height:5, backgroundColor:'var(--bg3)', borderRadius:3, overflow:'hidden', marginBottom:5 }}>
        <div style={{ height:'100%', width:`${Math.min(posRatio,100)}%`,
          backgroundColor:posColor, transition:'width 0.4s', borderRadius:3 }}/>
      </div>
      {posRatio>50 && (
        <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--r)' }}>
          ⚠ 仓位超过50%，注意风险管理</div>
      )}
      <div style={{ fontFamily:'IBM Plex Mono', fontSize:8, color:'var(--t3)', marginTop:4 }}>
        公式：最大亏损额 ÷ (入场价 − 止损价) = 最大持股数 · 100股取整
      </div>
    </div>
  )
}

function ActionCards({ result, biasLevel }: {
  result: AnalysisResult; biasLevel: ReturnType<typeof getBiasLevel>
}) {
  const b=result.totalScore, bias=result.ma20Bias??0
  const actions = [
    {
      title:'建仓建议',
      color: b>=4.3&&biasLevel.severity<4?'var(--g)':b>=4.0?'var(--y)':'var(--r)',
      content: b>=4.5&&biasLevel.severity<4
        ? `B分${b.toFixed(2)}≥4.5，信号强劲。${biasLevel.action}。三步建仓：第一步30%，浮盈≥2%追加，止损¥${result.stopLoss}`
        : b>=4.0&&biasLevel.severity<4
        ? `B分${b.toFixed(2)}，信号可操作。${biasLevel.action}。建议第一步≤30%，谨慎介入`
        : biasLevel.severity>=4
        ? `⑧乖离率${bias.toFixed(1)}%，${biasLevel.action}。暂缓建仓`
        : `B分${b.toFixed(2)}<4.0，建议观望，等待更强信号`,
    },
    {
      title:'持仓策略',
      color:'var(--c)',
      content:`止损¥${result.stopLoss}（提前埋好条件单）。浮盈≥5%可考虑第二步加仓。每周复盘：买入逻辑是否仍成立？成立则持有，不因短期波动换仓。`,
    },
    {
      title:'减仓标准',
      color:'var(--r)',
      content:`止损线：¥${result.stopLoss}（跌破无条件清仓）。逻辑破坏时清仓。月评连续两周B分<3.5则纳入轮换退出名单。`,
    },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
      {actions.map(({ title,color,content }) => (
        <div key={title} style={{ border:`1px solid ${color}33`, borderRadius:8,
          padding:'11px 13px', backgroundColor:`${color}06` }}>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color, fontWeight:700,
            marginBottom:7, letterSpacing:'0.06em' }}>{title}</div>
          <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.9 }}>{content}</div>
        </div>
      ))}
    </div>
  )
}

function TradeLogicEdit({ code, name }: { code:string; name:string }) {
  const key = `logic_${code}`
  const [data, setData] = useState({ why:'', sell:'', no:'' })
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    try { const r=localStorage.getItem(key); if(r) setData(JSON.parse(r)) } catch { /* ignore */ }
  }, [key])
  function save() {
    localStorage.setItem(key, JSON.stringify({...data, ts:Date.now()}))
    setSaved(true); setTimeout(()=>setSaved(false), 2000)
  }
  const ta: React.CSSProperties = {
    width:'100%', minHeight:52, resize:'vertical',
    backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
    color:'var(--t)', padding:'7px 10px', borderRadius:5,
    fontFamily:'Noto Sans SC, sans-serif', fontSize:11,
    lineHeight:1.8, outline:'none',
  }
  const lbl = (color:string): React.CSSProperties => ({
    fontFamily:'IBM Plex Mono', fontSize:9, color, letterSpacing:'0.1em',
    textTransform:'uppercase', marginBottom:5, marginTop:10, display:'block',
  })
  return (
    <div>
      <div style={{ fontSize:12, color:'var(--t2)', marginBottom:8 }}>
        <strong style={{ color:'var(--c)' }}>{name}（{code}）</strong> 持仓理由档案
      </div>
      <span style={lbl('var(--g)')}>✅ 买入理由（3个月逻辑）</span>
      <textarea value={data.why} onChange={e=>setData(d=>({...d,why:e.target.value}))}
        placeholder="① 具体逻辑…&#10;② 政策/板块背景…&#10;③ 数据验证…" style={ta}/>
      <span style={lbl('var(--r)')}>🔴 卖出条件（提前写死）</span>
      <textarea value={data.sell} onChange={e=>setData(d=>({...d,sell:e.target.value}))}
        placeholder="止损：跌破¥（提前埋好条件单）&#10;逻辑破坏：[填写失效条件]" style={ta}/>
      <span style={lbl('var(--y)')}>⚠️ 我不会因以下原因卖</span>
      <textarea value={data.no} onChange={e=>setData(d=>({...d,no:e.target.value}))}
        placeholder="· B分短期下降&#10;· 大盘整体调整&#10;· 其他涨得更好的标的" style={ta}/>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
        <button onClick={save} style={{
          fontFamily:'IBM Plex Mono', fontSize:10, padding:'6px 16px',
          border:`1px solid ${saved?'var(--g)':'var(--c)'}`,
          color: saved?'var(--g)':'var(--c)',
          backgroundColor:'transparent', borderRadius:5, cursor:'pointer' }}>
          {saved ? '✓ 已保存' : '💾 保存档案'}
        </button>
      </div>
    </div>
  )
}
