'use client'
/**
 * AnalysisResultCard.tsx  fix202603170141
 * V6 CSS完全一致版 - rhead/databar/dimrow/rrbar/action/logic全て再現
 */
import React, { useState, useEffect } from 'react'
import { TrendPanel } from './TrendPanel'
import type { AnalysisResult } from '@/types/domain'
import { getBSignal, getBiasLevel } from '@/lib/core/b-score'

const PORTFOLIO_CODES = ['000815','601225','601101','159326','000977','002371','300308','600598']

const DIM_META = [
  { icon:'①', name:'趋势共振',   color:'#00cfff' },
  { icon:'②', name:'量能加速',   color:'#00e87a' },
  { icon:'③', name:'Alpha超额',  color:'#ffd23f' },
  { icon:'④', name:'威科夫阶段', color:'#a78bfa' },
  { icon:'⑤', name:'板块生态',   color:'#00cfff' },
  { icon:'⑥', name:'资金流向',   color:'#00e87a' },
  { icon:'⑦', name:'基本面锚',   color:'#ffd23f' },
  { icon:'⑧', name:'乖离率控制', color:'#ff2d55' },
]

function parseRR(rr: string): number {
  const m = rr?.match(/1:([\d.]+)/)
  return m ? parseFloat(m[1]) : 0
}

// ── ctitスタイル（V6の.ctit完全一致）──
const ctit: React.CSSProperties = {
  fontFamily:'IBM Plex Mono,monospace',
  fontSize:9, letterSpacing:'0.12em',
  color:'var(--t2)', marginBottom:14,
  textTransform:'uppercase',
  display:'flex', alignItems:'center', justifyContent:'space-between',
}

// ── カードスタイル（V6の.card）──
function Card({ children, style, accent }: {
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: string
}) {
  return (
    <div style={{
      backgroundColor:'var(--bg2)',
      border:'1px solid var(--bd)',
      padding:'20px 22px',
      marginBottom:14,
      borderLeft: accent ? `3px solid ${accent}` : undefined,
      ...style,
    }}>
      {children}
    </div>
  )
}

export function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const signal   = getBSignal(result.totalScore)
  const rr       = parseRR(result.riskRatio)
  const rrColor  = rr >= 2 ? 'var(--g)' : rr >= 1 ? 'var(--y)' : 'var(--r)'
  const pnlUp    = result.changePct > 0
  const pnlColor = pnlUp ? 'var(--r)' : result.changePct < 0 ? 'var(--g)' : 'var(--t2)'
  const bias     = result.ma20Bias ?? 0
  const biasLvl  = getBiasLevel(bias)
  const isPort   = PORTFOLIO_CODES.includes(result.code)
  const [showTrend, setShowTrend] = useState(false)
  const [expandDim, setExpandDim] = useState<number | null>(null)

  // 七维度合計（①〜⑦）
  const score7 = result.scores?.slice(0, 7).reduce((s, d) => s + (d.score || 0), 0) ?? 0
  // 円環周長
  const CIRC = 2 * Math.PI * 48

  // freshness
  const freshStyle: React.CSSProperties = {
    position:'absolute', top:12, right:16,
    fontFamily:'IBM Plex Mono,monospace', fontSize:9,
    padding:'3px 8px', border:'1px solid', letterSpacing:'1px',
    borderColor:'var(--g)', color:'var(--g)',
    backgroundColor:'rgba(0,232,122,0.07)',
  }

  // 信号クラスカラー
  const sigBg: Record<string, string> = {
    '强力买入':'rgba(0,232,122,0.12)', '建议买入':'rgba(0,232,122,0.12)',
    '观望':'rgba(255,210,63,0.1)', '减仓':'rgba(255,123,53,0.1)',
    '清仓':'rgba(255,45,85,0.12)',
  }
  const sigBorder: Record<string, string> = {
    '强力买入':'var(--g)','建议买入':'var(--g)',
    '观望':'var(--y)','减仓':'var(--o)','清仓':'var(--r)',
  }
  const sigKey = Object.keys(sigBg).find(k => result.signal?.includes(k)) || '观望'

  return (
    <div>

      {/* ══ ① rhead（V6完全一致）══ */}
      <div style={{
        backgroundColor:'var(--bg2)',
        border:'1px solid var(--bd2)',
        padding:'26px 28px',
        marginBottom:14,
        position:'relative',
        overflow:'hidden',
        display:'grid',
        gridTemplateColumns:'1fr auto',
        gap:24,
        alignItems:'start',
      }}>
        {/* 上部グラデーションライン */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:1,
          background:'linear-gradient(90deg,var(--g),var(--c) 40%,transparent 80%)',
        }}/>

        {/* freshness ラベル */}
        <div style={freshStyle}>✓ 今日数据</div>

        {/* 左：株名・価格・信号 */}
        <div>
          {/* 株名 */}
          <div style={{
            fontSize:30, fontWeight:900, letterSpacing:1,
            lineHeight:1, marginBottom:12, color:'var(--t)',
          }}>{result.name}</div>

          {/* code + price + chgtag */}
          <div style={{
            display:'flex', gap:14, alignItems:'center',
            flexWrap:'wrap', marginBottom:14,
          }}>
            <span style={{
              fontFamily:'IBM Plex Mono,monospace', fontSize:11,
              color:'var(--t2)', letterSpacing:2,
            }}>{result.code}</span>
            <span style={{
              fontFamily:'IBM Plex Mono,monospace', fontSize:24,
              fontWeight:700, color:'var(--t)',
            }}>¥{result.price.toFixed(2)}</span>
            <span style={{
              fontFamily:'IBM Plex Mono,monospace', fontSize:12,
              padding:'3px 10px', border:'1px solid',
              borderColor: pnlUp ? 'rgba(255,45,85,0.3)' : 'rgba(0,232,122,0.3)',
              color: pnlColor,
              backgroundColor: pnlUp ? 'rgba(255,45,85,0.1)' : 'rgba(0,232,122,0.1)',
            }}>
              {result.changePct > 0 ? '+' : ''}{result.changePct.toFixed(2)}%
            </span>
          </div>

          {/* 信号バッジ + stag */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{
              fontSize:13, fontWeight:700, letterSpacing:4,
              padding:'6px 20px', display:'inline-block',
              backgroundColor: sigBg[sigKey] || 'rgba(255,210,63,0.1)',
              color: sigBorder[sigKey] || 'var(--y)',
              border:`1px solid ${sigBorder[sigKey] || 'var(--y)'}`,
              boxShadow: sigKey === '强力买入' || sigKey === '建议买入'
                ? '0 0 16px rgba(0,232,122,0.2)' : 'none',
            }}>{result.signal}</span>
            <span style={{
              fontFamily:'IBM Plex Mono,monospace', fontSize:10,
              color: biasLvl.color,
              padding:'3px 8px', border:`1px solid ${biasLvl.color}44`,
              backgroundColor:`${biasLvl.color}11`,
            }}>⑧ {biasLvl.label}</span>
          </div>
        </div>

        {/* 右：七维度円環 + B分ボックス */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          {/* ring-wrap (V6完全一致) */}
          <div style={{ textAlign:'center' }}>
            <div style={{ position:'relative', width:112, height:112, margin:'0 auto' }}>
              <svg width="112" height="112" viewBox="0 0 112 112"
                style={{ transform:'rotate(-90deg)', display:'block' }}>
                <circle className="rb" cx="56" cy="56" r="48"
                  fill="none" stroke="var(--bd2)" strokeWidth="6"/>
                <circle cx="56" cy="56" r="48"
                  fill="none" stroke={signal.color} strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${CIRC}`}
                  strokeDashoffset={`${CIRC * (1 - score7 / 35)}`}
                  style={{ transition:'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)' }}
                />
              </svg>
              <div style={{
                position:'absolute', top:'50%', left:'50%',
                transform:'translate(-50%,-50%)', textAlign:'center',
              }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:33, fontWeight:700, lineHeight:1, color:signal.color }}>
                  {score7}
                </div>
                <div style={{ fontSize:11, color:'var(--t2)', marginTop:2 }}>/35</div>
              </div>
            </div>
            <div style={{ fontSize:10, color:'var(--t2)', marginTop:8, letterSpacing:2, fontFamily:'IBM Plex Mono,monospace' }}>
              七维度总分
            </div>
          </div>

          {/* B分ボックス */}
          <div style={{
            backgroundColor:'var(--bg3)', border:'1px solid var(--bd2)',
            padding:'10px 14px', textAlign:'center', minWidth:112,
          }}>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:4 }}>
              基准B综合分
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:22, fontWeight:700, color:signal.color }}>
              {result.totalScore.toFixed(2)}
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, marginTop:4 }}>
              <span style={{ color:'var(--t2)' }}>⑧乖离：</span>
              <span style={{ color: biasLvl.color }}>
                {bias !== 0 ? `${bias > 0 ? '+' : ''}${bias.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, marginTop:2, color:biasLvl.color }}>
              {biasLvl.action || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ══ ② databar（V6: border:1px solid var(--bd2)、12格）══ */}
      <div style={{
        backgroundColor:'var(--bg2)',
        border:'1px solid var(--bd2)',
        marginBottom:14,
        display:'grid',
        gridTemplateColumns:'repeat(6,1fr)',
      }}>
        {/* 行1：行情データ */}
        {[
          { label:'今开',   value: result.open   != null ? `¥${result.open!.toFixed(2)}`   : '—' },
          { label:'最高',   value: result.high   != null ? `¥${result.high!.toFixed(2)}`   : '—', color:'var(--r)' },
          { label:'最低',   value: result.low    != null ? `¥${result.low!.toFixed(2)}`    : '—', color:'var(--g)' },
          { label:'成交量', value: result.volume != null ? `${((result.volume||0)/10000).toFixed(1)}万` : '—' },
          {
            label:'换手率',
            value: result.amount && result.price
              ? `${((result.amount||0)/1e8).toFixed(2)}亿` : '—',
          },
          {
            label:'BIAS200乖离★',
            value: bias !== 0 ? `${bias > 0 ? '+' : ''}${bias.toFixed(1)}%` : '—',
            color: biasLvl.color,
            sub1: `σ: —`,
            sub2: `警戒: ${bias > 30 ? '⚠高危' : bias > 20 ? '⚡注意' : '—'}`,
            special: true,
          },
        ].map(({ label, value, color, sub1, sub2, special }, i) => (
          <div key={i} style={{
            textAlign:'center',
            borderRight: i < 5 ? '1px solid var(--bd)' : 'none',
            borderBottom:'1px solid var(--bd)',
            padding:'10px 4px',
            backgroundColor: special ? `${biasLvl.color}08` : 'transparent',
            position:'relative',
          }}>
            <div style={{
              fontSize:9, color:'var(--t2)', letterSpacing:'1px',
              marginBottom:6, fontFamily:'IBM Plex Mono,monospace',
            }}>{label}{special ? <span style={{ marginLeft:2, fontSize:8 }}>?</span> : null}</div>
            <div style={{
              fontFamily:'IBM Plex Mono,monospace', fontSize:13,
              fontWeight:600, color: color || 'var(--t)',
            }}>{value}</div>
            {sub1 && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)', marginTop:2 }}>{sub1}</div>}
            {sub2 && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:biasLvl.color, marginTop:1 }}>{sub2}</div>}
          </div>
        ))}

        {/* 行2：均線データ */}
        {['MA5','MA10','MA20','MA60','MA120','MA200'].map((label, i) => (
          <div key={i} style={{
            textAlign:'center',
            borderRight: i < 5 ? '1px solid var(--bd)' : 'none',
            padding:'10px 4px',
          }}>
            <div style={{ fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:6, fontFamily:'IBM Plex Mono,monospace' }}>{label}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:600, color:'var(--t2)' }}>—</div>
          </div>
        ))}
      </div>

      {/* ══ ③ DIMENSIONS + RADAR（V6: cols2 grid）══ */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr',
        gap:14, marginBottom:14,
      }}>
        {/* 左：八维度 */}
        <div style={{ backgroundColor:'var(--bg2)', border:'1px solid var(--bd)', padding:'20px 22px' }}>
          <div style={ctit}>DIMENSIONS · 八维度分项（点击查看详情）⑧=乖离率控制</div>
          <div>
            {DIM_META.map((meta, i) => {
              const sc    = result.scores?.[i]
              const score = i === 7
                ? Math.min(5, Math.max(0, 5 - (bias > 35 ? 5 : bias > 30 ? 2.5 : bias > 25 ? 1.8 : bias > 20 ? 0.8 : 0)))
                : (sc?.score ?? 0)
              const text  = sc?.analysis ?? result.analyses?.[i] ?? ''
              const pct   = Math.min((score / 5) * 100, 100)
              const isOpen = expandDim === i
              const dotColor = score >= 4 ? 'var(--g)' : score >= 3 ? meta.color : 'var(--r)'

              return (
                <div key={i}>
                  <div
                    onClick={() => setExpandDim(isOpen ? null : i)}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      marginBottom: isOpen ? 0 : 10,
                      cursor:'pointer',
                      transition:'opacity .15s',
                      padding:'6px 8px',
                      border:`1px solid ${isOpen ? 'rgba(0,207,255,0.25)' : 'transparent'}`,
                      backgroundColor: isOpen ? 'rgba(0,207,255,0.05)' : 'transparent',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd2)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,207,255,0.03)' }}
                    onMouseLeave={e => { if (!isOpen) { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' } }}
                  >
                    <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)', width:14, flexShrink:0 }}>{meta.icon}</span>
                    <span style={{ fontSize:11, color:'var(--t2)', width:68, flexShrink:0 }}>{meta.name}</span>
                    {/* .dbar */}
                    <div style={{ flex:1, height:3, backgroundColor:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, backgroundColor:meta.color, borderRadius:2, transition:'width 1.3s cubic-bezier(.4,0,.2,1)' }}/>
                    </div>
                    {/* .dots */}
                    <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                      {[1,2,3,4,5].map(v => (
                        <div key={v} style={{
                          width:6, height:6, borderRadius:'50%',
                          backgroundColor: v <= Math.round(score) ? dotColor : 'var(--bd2)',
                        }}/>
                      ))}
                    </div>
                    {/* .dscore */}
                    <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, fontWeight:700, width:16, textAlign:'right', flexShrink:0, color:meta.color }}>
                      {score > 0 ? score.toFixed(0) : '—'}
                    </span>
                  </div>
                  {/* .dim-expand */}
                  {isOpen && text && (
                    <div style={{
                      fontSize:11, color:'var(--t2)', lineHeight:1.7,
                      padding:'10px 14px',
                      backgroundColor:'var(--bg3)',
                      borderLeft:'2px solid var(--c)',
                      marginBottom:10,
                    }}>
                      {i === 7 ? `乖离率：${biasLvl.label}（${biasLvl.action}）` : text}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 右：レーダー */}
        <div style={{ backgroundColor:'var(--bg2)', border:'1px solid var(--bd)', padding:'20px 22px',
          display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={ctit}>RADAR · 雷达图</div>
          <RadarChart scores={result.scores ?? []} />
        </div>
      </div>

      {/* ══ ④ ANALYSIS（V6完全一致）══ */}
      <Card>
        <div style={ctit}>
          <span>ANALYSIS · AI分析详情（实时搜索 · 今日数据验证）</span>
          <button onClick={() => setShowTrend(v => !v)} style={{
            padding:'5px 16px',
            background:'linear-gradient(135deg,#005580,#0077aa)',
            border:'1.5px solid #00cfff', color:'#ffffff',
            borderRadius:4, cursor:'pointer', fontSize:11,
            fontFamily:'IBM Plex Mono,monospace', letterSpacing:'0.5px',
            whiteSpace:'nowrap', fontWeight:600,
            boxShadow:'0 1px 6px rgba(0,207,255,0.25)',
          }}>
            📈 {showTrend ? '收起走势' : '90天走势'}
          </button>
        </div>

        {/* .atext */}
        <div style={{
          fontSize:13, lineHeight:2.1, color:'var(--t)',
          whiteSpace:'pre-wrap',
        }}>
          {result.summary || '—'}
        </div>

        {/* 各维度详細分析 */}
        {result.analyses && result.analyses.some(Boolean) && (
          <div style={{
            marginTop:12, padding:'10px 14px',
            backgroundColor:'var(--bg3)', borderLeft:'2px solid var(--c)',
            fontSize:11, color:'var(--t2)', lineHeight:1.8,
          }}>
            {result.analyses.map((a, i) => a ? (
              <div key={i} style={{ marginBottom:3 }}>
                <b style={{ color: DIM_META[i]?.color || 'var(--c)', fontWeight:500, fontFamily:'IBM Plex Mono,monospace' }}>
                  {DIM_META[i]?.icon}{DIM_META[i]?.name}：
                </b>{a}
              </div>
            ) : null)}
          </div>
        )}

        {/* .dsrc */}
        <div style={{
          display:'flex', justifyContent:'space-between', flexWrap:'wrap',
          gap:8, fontFamily:'IBM Plex Mono,monospace', fontSize:9,
          color:'var(--t2)', marginTop:14, paddingTop:12,
          borderTop:'1px solid var(--bd)',
        }}>
          <span>数据来源：Claude AI实时网络搜索</span>
          <span>分析时间：{new Date(result.createdAt).toLocaleString('zh-CN', { timeZone:'Asia/Shanghai' })}</span>
        </div>
      </Card>

      {/* TrendPanel */}
      {showTrend && (
        <TrendPanel code={result.code} stopLoss={result.stopLoss} targetPrice={result.targetPrice} />
      )}

      {/* ══ ⑤ RISK/REWARD（V6完全一致）══ */}
      <Card accent="var(--g)">
        <div style={ctit}>RISK / REWARD · 盈亏比</div>
        {/* .rrg */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
          {[
            { label:'当前价格', value:`¥${result.price.toFixed(2)}`,  color:'var(--t)'  },
            { label:'建议止损', value:`¥${result.stopLoss}`,          color:'var(--r)'  },
            { label:'目标价位', value:`¥${result.targetPrice}`,       color:'var(--g)'  },
            { label:'盈亏比',   value:result.riskRatio||'—',          color:rrColor     },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              backgroundColor:'var(--bg3)', border:'1px solid var(--bd)',
              padding:14, textAlign:'center',
            }}>
              <div style={{ fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:8, fontFamily:'IBM Plex Mono,monospace' }}>
                {label}
              </div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:19, fontWeight:700, color }}>
                {value}
              </div>
            </div>
          ))}
        </div>
        <RRBar price={result.price} stopLoss={result.stopLoss} targetPrice={result.targetPrice} />
      </Card>

      {/* ══ ⑥ POSITION CALC（V6完全一致・常時展開）══ */}
      <Card>
        <div style={ctit}>
          <span>POSITION CALC · 止损仓位计算器</span>
          <span style={{ fontWeight:400, fontSize:8 }}>根据最大亏损额反推合理仓位</span>
        </div>
        <PositionCalc price={result.price} stopLoss={result.stopLoss} />
      </Card>

      {/* ══ ⑦ ACTION（V6完全一致）══ */}
      <Card>
        <div style={ctit}>ACTION · 三段操作建议</div>
        {/* .acg */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:14 }}>
          {[
            {
              label:'🎯 建仓策略（分批三步法）',
              id:'acE',
              content: result.totalScore >= 4.5 && biasLvl.severity < 4
                ? `B分${result.totalScore.toFixed(2)}≥4.5，强力信号。${biasLvl.action}。第一步建仓30%，浮盈≥2%第二步+30%，浮盈≥5%第三步+20%。止损¥${result.stopLoss}提前埋好条件单`
                : result.totalScore >= 4.0 && biasLvl.severity < 4
                ? `B分${result.totalScore.toFixed(2)}，信号可操作。${biasLvl.action}。保守建仓第一步≤30%，止损-8%`
                : biasLvl.severity >= 4
                ? `⑧乖离率${bias.toFixed(1)}%，${biasLvl.action}，暂缓建仓，等待乖离率回落至20%以下`
                : `B分${result.totalScore.toFixed(2)}<4.0，建议观望，等待更强技术信号再介入`,
            },
            {
              label:'📊 持仓管理',
              id:'acH',
              content: `止损¥${result.stopLoss}（提前埋好条件单）。浮盈≥5%可考虑第二步加仓。每周复盘：买入逻辑是否仍成立？成立则持有，不因短期波动换仓。`,
            },
            {
              label:'⚠️ 风险提示（⑧维度约束）',
              id:'acR',
              content: `⑧乖离：${biasLvl.label}。止损线：¥${result.stopLoss}（跌破无条件清仓）。逻辑破坏时清仓。月评连续两周B分<3.5则纳入轮换退出名单。`,
            },
          ].map(({ label, content }) => (
            <div key={label} style={{
              backgroundColor:'var(--bg3)',
              border:'1px solid var(--bd)',
              padding:'14px 16px',
            }}>
              <div style={{ fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:7, fontFamily:'IBM Plex Mono,monospace' }}>
                {label}
              </div>
              <div style={{ fontSize:12, lineHeight:1.9, color:'var(--t)' }}>
                {content}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ══ ⑧ 持仓理由档案（V6完全一致）══ */}
      {isPort && (
        <Card accent="var(--g)">
          <div style={ctit}>
            <span>📋 持仓理由档案 · 低频操作核心工具</span>
            <span style={{ fontWeight:400, fontSize:8 }}>填写后自动保存 · 换股前先看第③条</span>
          </div>
          <TradeLogicEdit code={result.code} name={result.name} stopLoss={result.stopLoss} />
          {/* 低频操作原则说明 */}
          <div style={{
            marginTop:10, padding:'8px 12px',
            backgroundColor:'rgba(0,232,122,0.05)',
            border:'1px solid rgba(0,232,122,0.2)',
            fontSize:11, color:'var(--t2)', lineHeight:1.9,
          }}>
            💡 <strong style={{ color:'var(--g)' }}>低频操作原则：</strong>
            每周复盘只问一件事——「我当初买它的理由，今天还成立吗？」成立→持有不动。不确定→不加仓不减仓，下周再看。不成立/止损触发→执行卖出，无条件。<br/>
            换股冲动来临时，先看第③条——大多数冲动会自然消失。
          </div>
        </Card>
      )}
    </div>
  )
}

/* ───────────────── 子コンポーネント ───────────────── */

function RadarChart({ scores }: { scores: Array<{ score: number }> }) {
  const cx = 120, cy = 120, r = 90, n = 7
  const labels = ['热势','量价','Alpha','威科夫','板块','资金','基本']
  const angle  = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2
  const pt     = (i: number, v: number): [number, number] => {
    const a = angle(i), rv = (v / 5) * r
    return [cx + rv * Math.cos(a), cy + rv * Math.sin(a)]
  }
  const vals = scores.slice(0, 7).map(s => s?.score ?? 0)

  return (
    <svg width="240" height="240" viewBox="0 0 240 240"
      style={{ display:'block', margin:'0 auto' }}>
      {[1,2,3,4,5].map(g => (
        <polygon key={g} fill="none" stroke="rgba(0,207,255,0.08)" strokeWidth="0.5"
          points={Array.from({length:n}, (_,i) => pt(i,g).join(',')).join(' ')}/>
      ))}
      {Array.from({length:n}, (_,i) => (
        <line key={i} x1={cx} y1={cy} x2={pt(i,5)[0]} y2={pt(i,5)[1]}
          stroke="rgba(0,207,255,0.06)" strokeWidth="0.5"/>
      ))}
      <polygon fill="rgba(0,207,255,0.12)" stroke="#00cfff" strokeWidth="1.5"
        points={vals.map((v,i) => pt(i,v).join(',')).join(' ')}/>
      {labels.map((label, i) => {
        const [x, y] = pt(i, 5.8)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fontFamily="IBM Plex Mono,monospace" fill="var(--t2)">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

function RRBar({ price, stopLoss, targetPrice }: { price:number; stopLoss:number; targetPrice:number }) {
  const risk   = price - stopLoss
  const reward = targetPrice - price
  const total  = risk + reward
  if (total <= 0 || risk <= 0) return null
  const riskW   = (risk / total) * 100
  const rewardW = (reward / total) * 100
  const rr      = reward / risk

  return (
    <div>
      {/* .rrbar */}
      <div style={{ height:10, borderRadius:5, overflow:'hidden', backgroundColor:'var(--bg3)', display:'flex', marginBottom:6 }}>
        <div style={{ width:`${riskW}%`, backgroundColor:'var(--r)', transition:'width 1.2s ease' }}/>
        <div style={{ width:`${rewardW}%`, backgroundColor:'var(--g)', transition:'width 1.2s ease' }}/>
      </div>
      {/* .rrlabels */}
      <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)' }}>
        <span style={{ color:'var(--r)' }}>止损 -{risk.toFixed(2)}元 ({riskW.toFixed(0)}%)</span>
        <span style={{ color: rr>=2?'var(--g)':rr>=1?'var(--y)':'var(--r)' }}>1:{rr.toFixed(1)}</span>
        <span style={{ color:'var(--g)' }}>+{reward.toFixed(2)}元 ({rewardW.toFixed(0)}%)</span>
      </div>
    </div>
  )
}

function PositionCalc({ price, stopLoss }: { price:number; stopLoss:number }) {
  const [capital, setCapital] = useState('1000000')
  const [maxLoss, setMaxLoss] = useState('2')

  const cap        = parseFloat(capital||'0')
  const ml         = parseFloat(maxLoss||'0')
  const maxLossAmt = cap * ml / 100
  const riskPS     = price - stopLoss
  const maxShares  = riskPS > 0 ? Math.floor(maxLossAmt / riskPS / 100) * 100 : 0
  const posAmt     = maxShares * price
  const posRatio   = cap > 0 ? posAmt / cap * 100 : 0
  const posColor   = posRatio > 50 ? 'var(--r)' : posRatio > 30 ? 'var(--y)' : 'var(--g)'

  const inp: React.CSSProperties = {
    backgroundColor:'var(--bg3)', border:'1px solid var(--bd2)',
    color:'var(--t)', fontFamily:'IBM Plex Mono,monospace', fontSize:12,
    padding:'9px 12px', outline:'none', width:'100%',
    transition:'border 0.2s',
  }

  return (
    <div>
      {/* 入力3列 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <div style={{ fontSize:9, color:'var(--t2)', fontFamily:'IBM Plex Mono,monospace', letterSpacing:'1px', marginBottom:6 }}>总资金（元）</div>
          <input type="number" value={capital} onChange={e => setCapital(e.target.value)} style={inp}/>
        </div>
        <div>
          <div style={{ fontSize:9, color:'var(--t2)', fontFamily:'IBM Plex Mono,monospace', letterSpacing:'1px', marginBottom:6 }}>最大亏损（%）</div>
          <input type="number" value={maxLoss} onChange={e => setMaxLoss(e.target.value)} style={inp}/>
        </div>
        <div>
          <div style={{ fontSize:9, color:'var(--t2)', fontFamily:'IBM Plex Mono,monospace', letterSpacing:'1px', marginBottom:6 }}>止损价 / 入场价</div>
          <div style={{ ...inp, color:'var(--t2)' }}>¥{stopLoss.toFixed(2)} / ¥{price.toFixed(2)}</div>
        </div>
      </div>
      {/* 結果4格 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:8 }}>
        {[
          { label:'每股风险',  val:`¥${riskPS.toFixed(2)}`,                                       color:'var(--r)' },
          { label:'最大持股数', val:`${maxShares.toLocaleString()}股`,                              color:'var(--c)' },
          { label:'建仓金额',  val:`¥${posAmt.toLocaleString(undefined,{maximumFractionDigits:0})}`, color:'var(--y)' },
          { label:'仓位比例',  val:`${posRatio.toFixed(1)}%`,                                      color:posColor   },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ backgroundColor:'var(--bg3)', border:'1px solid rgba(0,207,255,0.15)', padding:'10px 12px', textAlign:'center' }}>
            <div style={{ fontSize:9, color:'var(--t2)', fontFamily:'IBM Plex Mono,monospace', letterSpacing:'1px', marginBottom:4 }}>{label}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:16, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>
      {/* 仓位バー */}
      <div style={{ height:5, backgroundColor:'var(--bg3)', borderRadius:3, overflow:'hidden', marginBottom:5 }}>
        <div style={{ height:'100%', width:`${Math.min(posRatio,100)}%`, backgroundColor:posColor, transition:'width 0.4s', borderRadius:3 }}/>
      </div>
      {posRatio > 50 && (
        <div style={{ fontSize:9, color:'var(--r)', fontFamily:'IBM Plex Mono,monospace', marginTop:3 }}>
          ⚠ 仓位超过50%，注意融资风险
        </div>
      )}
      <div style={{ fontSize:9, color:'var(--t2)', fontFamily:'IBM Plex Mono,monospace', marginTop:5 }}>
        公式：最大亏损额 ÷ 每股风险 → 最大A股 · 100股取整
      </div>
    </div>
  )
}

function TradeLogicEdit({ code, name, stopLoss }: { code:string; name:string; stopLoss:number }) {
  const key = `logic_${code}`
  const [data, setData] = useState({ why:'', sell:'', no:'' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const r = localStorage.getItem(key)
      if (r) setData(JSON.parse(r))
    } catch { /* ignore */ }
  }, [key])

  // oninputで自動保存（V6と同じ）
  function autoSave(next: typeof data) {
    try { localStorage.setItem(key, JSON.stringify({ ...next, ts: Date.now() })) } catch { /* ignore */ }
  }

  function handleChange(field: keyof typeof data, val: string) {
    const next = { ...data, [field]: val }
    setData(next)
    autoSave(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const taBase: React.CSSProperties = {
    width:'100%', background:'var(--bg3)', color:'var(--t)',
    fontFamily:'Noto Sans SC,sans-serif', fontSize:11,
    padding:'8px 10px', resize:'vertical', outline:'none', lineHeight:1.7,
    rows: 4,
  } as React.CSSProperties

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        <div>
          <div style={{ fontSize:9, color:'var(--g)', fontFamily:'IBM Plex Mono,monospace', letterSpacing:'2px', marginBottom:6 }}>
            ① 买入理由（3个月逻辑）
          </div>
          <textarea rows={4} value={data.why}
            onChange={e => handleChange('why', e.target.value)}
            placeholder="例：中东战争→煤炭供给紧张→价格中期看涨；股息率7%保底；逻辑有效期至战争结束"
            style={{ ...taBase, border:'1px solid var(--bd2)' }}/>
        </div>
        <div>
          <div style={{ fontSize:9, color:'var(--r)', fontFamily:'IBM Plex Mono,monospace', letterSpacing:'2px', marginBottom:6 }}>
            ② 卖出条件（提前写死）
          </div>
          <textarea rows={4} value={data.sell}
            onChange={e => handleChange('sell', e.target.value)}
            placeholder={`止损：跌破¥${stopLoss.toFixed(2)}（成本×0.92）\n逻辑破坏：___发生时卖出\n月评：连续两周B<3.5`}
            style={{ ...taBase, border:'1px solid rgba(255,45,85,0.3)' }}/>
        </div>
        <div>
          <div style={{ fontSize:9, color:'var(--y)', fontFamily:'IBM Plex Mono,monospace', letterSpacing:'2px', marginBottom:6 }}>
            ③ 不会因以下原因卖（预判情绪陷阱）
          </div>
          <textarea rows={4} value={data.no}
            onChange={e => handleChange('no', e.target.value)}
            placeholder="· B分从5.0短期降到4.3&#10;· 大盘调整带动被动下跌&#10;· 看到其他标的涨得更多&#10;· 短期消息面扰动"
            style={{ ...taBase, border:'1px solid rgba(255,210,63,0.3)' }}/>
        </div>
      </div>
      {saved && (
        <div style={{ marginTop:6, fontSize:9, color:'var(--g)', fontFamily:'IBM Plex Mono,monospace', textAlign:'right' }}>
          ✓ 已自动保存
        </div>
      )}
    </div>
  )
}
