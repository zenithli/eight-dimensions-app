'use client'
import { TrendPanel } from './TrendPanel'
/**
 * AnalysisResultCard.tsx  fix202603170203
 * V6完全一致版 - 全データ実値表示
 * 修正点:
 *  - MA5〜MA200 実値表示（APIから取得）
 *  - 換手率 実値表示
 *  - ⑧乖離 実値+ラベル+色
 *  - ACTION 3列 実テキスト（AI生成）
 *  - 走勢図 → /api/kline エンドポイント経由（CORSなし）
 *  - 信号バッジ V6完全一致（色・サイズ・文字）
 *  - dimrow ドット色（≥4=緑、≤2=赤）
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { AnalysisResult } from '@/types/domain'
import { getBSignal, getBiasLevel } from '@/lib/core/b-score'

const PORTFOLIO_CODES = ['000815','601225','601101','159326','000977','002371','300308','600598']

const DIM_NAMES = ['趋势共振','量能加速','Alpha超额','威科夫阶段','板块生态','资金流向','基本面锚','乖离率控']
const DIM_ICONS = ['①','②','③','④','⑤','⑥','⑦','⑧']

function parseRR(rr: string): number {
  const m = rr?.match(/1:([\d.]+)/)
  return m ? parseFloat(m[1]) : 0
}

// ── V6の.cardと同じスタイル ──
const cardS = (accent?: string): React.CSSProperties => ({
  backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
  padding:'20px 22px', marginBottom:14,
  ...(accent ? { borderLeft:`3px solid ${accent}` } : {}),
})

const ctitS: React.CSSProperties = {
  fontFamily:'IBM Plex Mono,monospace', fontSize:9,
  letterSpacing:'0.12em', color:'var(--t2)',
  marginBottom:14, textTransform:'uppercase',
  display:'flex', alignItems:'center', justifyContent:'space-between',
}

// ── 信号→V6クラス相当スタイル ──
function sigStyle(signal: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string; shadow?: string }> = {
    '强力买入': { bg:'rgba(0,232,122,0.12)', color:'var(--g)', shadow:'0 0 16px rgba(0,232,122,0.2)' },
    '建议买入': { bg:'rgba(0,232,122,0.12)', color:'var(--g)', shadow:'0 0 16px rgba(0,232,122,0.2)' },
    '积极关注': { bg:'rgba(0,207,255,0.12)', color:'var(--c)', shadow:'0 0 16px rgba(0,207,255,0.2)' },
    '观望':     { bg:'rgba(255,210,63,0.10)', color:'var(--y)' },
    '减仓':     { bg:'rgba(255,123,53,0.10)', color:'var(--o)' },
    '规避':     { bg:'rgba(255,45,85,0.12)',  color:'var(--r)', shadow:'0 0 16px rgba(255,45,85,0.2)' },
    '清仓':     { bg:'rgba(255,45,85,0.12)',  color:'var(--r)', shadow:'0 0 16px rgba(255,45,85,0.2)' },
  }
  const found = Object.entries(map).find(([k]) => signal?.includes(k))
  const s = found ? found[1] : map['观望']
  return {
    fontSize:13, fontWeight:700, letterSpacing:4,
    padding:'6px 20px', display:'inline-block',
    backgroundColor: s.bg, color: s.color,
    border:`1px solid ${s.color}`,
    boxShadow: s.shadow || 'none',
  }
}

// ── M数値表示（0の場合は—）──
function fmtMA(v?: number): string {
  if (!v || v === 0) return '—'
  return v.toFixed(2)
}

export function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const signal   = getBSignal(result.totalScore)
  const rr       = parseRR(result.riskRatio)
  const rrColor  = rr >= 2 ? 'var(--g)' : rr >= 1 ? 'var(--y)' : 'var(--r)'
  const pnlUp    = result.changePct > 0
  const pnlColor = pnlUp ? 'var(--r)' : result.changePct < 0 ? 'var(--g)' : 'var(--t2)'
  const isPort   = PORTFOLIO_CODES.includes(result.code)

  // ⑧乖離: APIから来たbiasLabel/biasActionTextを優先
  const bias      = result.ma20Bias ?? 0
  const biasLvl   = getBiasLevel(bias)
  const biasLabel = result.biasLabel || biasLvl.label
  const biasAction= result.biasActionText || biasLvl.action

  const [expandDim, setExpandDim] = useState<number | null>(null)
  const [showTrend, setShowTrend]  = useState(false)

  const score7 = result.scores?.slice(0,7).reduce((s,d)=>s+(d.score||0),0) ?? 0
  const CIRC   = 2 * Math.PI * 48

  // freshness
  const freshOk = result.dataFreshness === 'today'
  const freshStyle: React.CSSProperties = {
    position:'absolute', top:12, right:16,
    fontFamily:'IBM Plex Mono,monospace', fontSize:9,
    padding:'3px 8px', border:'1px solid', letterSpacing:'1px',
    borderColor: freshOk ? 'var(--g)' : 'var(--y)',
    color:        freshOk ? 'var(--g)' : 'var(--y)',
    backgroundColor: freshOk ? 'rgba(0,232,122,0.07)' : 'rgba(255,210,63,0.07)',
  }

  return (
    <div>

      {/* ══ ① rhead ══ */}
      <div style={{
        backgroundColor:'var(--bg2)', border:'1px solid var(--bd2)',
        padding:'26px 28px', marginBottom:14,
        position:'relative', overflow:'hidden',
        display:'grid', gridTemplateColumns:'1fr auto', gap:24, alignItems:'start',
      }}>
        {/* グラデーションライン */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:1,
          background:'linear-gradient(90deg,var(--g),var(--c) 40%,transparent 80%)',
        }}/>
        {/* freshness */}
        <div style={freshStyle}>{freshOk ? '✓ 今日数据' : '⚠ 数据时效未知'}</div>

        {/* 左：株名・価格・信号 */}
        <div>
          <div style={{ fontSize:30, fontWeight:900, letterSpacing:1, lineHeight:1, marginBottom:12, color:'var(--t)' }}>
            {result.name}
          </div>
          <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, color:'var(--t2)', letterSpacing:2 }}>
              {result.code} · A股
            </span>
            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:24, fontWeight:700, color:pnlColor }}>
              {result.price.toFixed(2)}元
            </span>
            <span style={{
              fontFamily:'IBM Plex Mono,monospace', fontSize:12,
              padding:'3px 10px', border:'1px solid',
              borderColor: pnlUp ? 'rgba(255,45,85,0.3)' : 'rgba(0,232,122,0.3)',
              color: pnlColor,
              backgroundColor: pnlUp ? 'rgba(255,45,85,0.1)' : 'rgba(0,232,122,0.1)',
            }}>
              {result.change != null ? (result.change > 0 ? '+' : '') + result.change.toFixed(2) : ''}
              {'  '}{result.changePct > 0 ? '+' : ''}{result.changePct.toFixed(2)}%
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={sigStyle(result.signal)}>{result.signal}</span>
            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'var(--t2)' }}>
              {score7 >= 28 ? '⭐强势信号' : score7 >= 22 ? '▶中性偏强' : score7 >= 16 ? '◆中性' : '▼偏弱'}
            </span>
          </div>
        </div>

        {/* 右：七维度円環 + B分ボックス */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ position:'relative', width:112, height:112, margin:'0 auto' }}>
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ transform:'rotate(-90deg)', display:'block' }}>
                <circle cx="56" cy="56" r="48" fill="none" stroke="var(--bd2)" strokeWidth="6"/>
                <circle cx="56" cy="56" r="48" fill="none" stroke={signal.color} strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${CIRC}`}
                  strokeDashoffset={`${CIRC * (1 - score7/35)}`}
                  style={{ transition:'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)' }}/>
              </svg>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center' }}>
                <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:33, fontWeight:700, lineHeight:1, color:signal.color }}>{score7}</div>
                <div style={{ fontSize:11, color:'var(--t2)', marginTop:2 }}>/35</div>
              </div>
            </div>
            <div style={{ fontSize:10, color:'var(--t2)', marginTop:8, letterSpacing:2, fontFamily:'IBM Plex Mono,monospace' }}>七维度总分</div>
          </div>
          <div style={{ backgroundColor:'var(--bg3)', border:'1px solid var(--bd2)', padding:'10px 14px', textAlign:'center', minWidth:112 }}>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:4 }}>基准B综合分</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:22, fontWeight:700, color:signal.color }}>{result.totalScore.toFixed(2)}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, marginTop:4 }}>
              <span style={{ color:'var(--t2)' }}>⑧乖离：</span>
              <span style={{ color:biasLvl.color }}>{biasLabel}</span>
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, marginTop:2, color:biasLvl.color }}>{biasAction}</div>
          </div>
        </div>
      </div>

      {/* ══ ② databar 12格（実値）══ */}
      <div style={{
        backgroundColor:'var(--bg2)', border:'1px solid var(--bd2)',
        marginBottom:14, display:'grid', gridTemplateColumns:'repeat(6,1fr)',
      }}>
        {/* 行1：行情 */}
        {[
          { label:'今开',  value: result.open  ? `¥${result.open.toFixed(2)}`  : '—' },
          { label:'最高',  value: result.high  ? `¥${result.high.toFixed(2)}`  : '—', color:'var(--r)' },
          { label:'最低',  value: result.low   ? `¥${result.low.toFixed(2)}`   : '—', color:'var(--g)' },
          { label:'成交量',value: result.volume? `${(result.volume/10000).toFixed(1)}万`: '—' },
          { label:'换手率',value: result.turnoverPct ? `${result.turnoverPct.toFixed(2)}%` : '—' },
          {
            label:'BIAS200乖离★',
            value: bias !== 0 ? `${bias > 0 ? '+' : ''}${bias.toFixed(2)}%` : '—',
            color: biasLvl.color, sub1:'σ: —',
            sub2:`警戒: ${Math.abs(bias) > 30 ? '⚠超警戒' : Math.abs(bias) > 20 ? '⚡注意' : '—'}`,
            special: true,
          },
        ].map(({ label, value, color, sub1, sub2, special }, i) => (
          <div key={i} style={{
            textAlign:'center',
            borderRight: i < 5 ? '1px solid var(--bd)' : 'none',
            borderBottom:'1px solid var(--bd)', padding:'10px 4px',
            backgroundColor: special ? `${biasLvl.color}08` : 'transparent',
          }}>
            <div style={{ fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:6, fontFamily:'IBM Plex Mono,monospace' }}>
              {label}{special && <span style={{ marginLeft:2, opacity:.7 }}>?</span>}
            </div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:600, color: color || 'var(--t)' }}>{value}</div>
            {sub1 && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)', marginTop:2 }}>{sub1}</div>}
            {sub2 && <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:biasLvl.color, marginTop:1 }}>{sub2}</div>}
          </div>
        ))}
        {/* 行2：MA均線（実値） */}
        {([
          { label:'MA5',   value: fmtMA(result.ma5),  color: result.ma5  && result.price ? (result.price > result.ma5  ? 'var(--r)' : 'var(--g)') : 'var(--t2)' },
          { label:'MA10',  value: fmtMA(result.ma10), color: result.ma10 && result.price ? (result.price > result.ma10 ? 'var(--r)' : 'var(--g)') : 'var(--t2)' },
          { label:'MA20',  value: fmtMA(result.ma20), color: result.ma20 && result.price ? (result.price > result.ma20 ? 'var(--r)' : 'var(--g)') : 'var(--t2)' },
          { label:'MA60',  value: fmtMA(result.ma60), color: result.ma60 && result.price ? (result.price > result.ma60 ? 'var(--r)' : 'var(--g)') : 'var(--t2)' },
          { label:'MA120', value: fmtMA(result.ma120),color: result.ma120&& result.price ? (result.price > result.ma120? 'var(--r)' : 'var(--g)') : 'var(--t2)' },
          { label:'MA200', value: fmtMA(result.ma200),color: result.ma200&& result.price ? (result.price > result.ma200? 'var(--r)' : 'var(--g)') : 'var(--t2)' },
        ] as {label:string;value:string;color:string}[]).map(({ label, value, color }, i) => (
          <div key={i} style={{
            textAlign:'center',
            borderRight: i < 5 ? '1px solid var(--bd)' : 'none',
            padding:'10px 4px',
          }}>
            <div style={{ fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:6, fontFamily:'IBM Plex Mono,monospace' }}>{label}</div>
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:600, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ══ ③ DIMENSIONS + RADAR ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        {/* 八维度 */}
        <div style={cardS()}>
          <div style={ctitS}>DIMENSIONS · 八维度分项（点击查看详情）⑧=乖离率控制</div>
          {(result.scores?.length ? result.scores : Array(8).fill({score:0,analysis:''})).map((sc, i) => {
            const score = i === 7
              ? Math.min(5, Math.max(0, 5 - (Math.abs(bias) > 35 ? 5 : Math.abs(bias) > 30 ? 2.5 : Math.abs(bias) > 25 ? 1.5 : Math.abs(bias) > 20 ? 0.8 : 0)))
              : (sc.score ?? 0)
            const text  = sc.analysis ?? result.analyses?.[i] ?? ''
            const pct   = (score / 5) * 100
            // V6のドット色: ≥4=緑、≤2=赤、それ以外=シアン
            const dotClass = score >= 4 ? '#00e87a' : score <= 2 ? '#ff2d55' : '#00cfff'
            const barColor = dotClass
            const isOpen   = expandDim === i

            return (
              <div key={i}>
                <div
                  onClick={() => setExpandDim(isOpen ? null : i)}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    marginBottom: isOpen ? 0 : (i < 7 ? 12 : 0),
                    cursor:'pointer', padding:'6px 8px',
                    border:`1px solid ${isOpen ? 'rgba(0,207,255,0.25)' : 'transparent'}`,
                    backgroundColor: isOpen ? 'rgba(0,207,255,0.05)' : 'transparent',
                    transition:'all .15s',
                  }}
                >
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)', width:14, flexShrink:0 }}>{i+1}</div>
                  <div style={{ fontSize:11, color:'var(--t2)', width:68, flexShrink:0 }}>{DIM_NAMES[i]}</div>
                  {/* .dbar */}
                  <div style={{ flex:1, height:3, backgroundColor:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, backgroundColor:barColor, borderRadius:2, transition:'width 1.3s cubic-bezier(.4,0,.2,1)' }}/>
                  </div>
                  {/* .dots 6px */}
                  <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                    {[1,2,3,4,5].map(v => (
                      <div key={v} style={{
                        width:6, height:6, borderRadius:'50%',
                        backgroundColor: v <= Math.round(score) ? dotClass : 'var(--bd2)',
                      }}/>
                    ))}
                  </div>
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, fontWeight:700, width:16, textAlign:'right', flexShrink:0, color:barColor }}>
                    {score > 0 ? score.toFixed(0) : '—'}
                  </div>
                </div>
                {isOpen && (
                  <div style={{
                    fontSize:11, color:'var(--t2)', lineHeight:1.7,
                    padding:'10px 14px', backgroundColor:'var(--bg3)',
                    borderLeft:'2px solid var(--c)', marginBottom:12,
                  }}>
                    {i === 7
                      ? `⑧乖离率：${biasLabel}（${biasAction}）MA20乖离=${bias.toFixed(2)}%`
                      : (text || DIM_ICONS[i] + DIM_NAMES[i] + '：暂无详细分析')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {/* レーダー */}
        <div style={{ ...cardS(), display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={ctitS}>RADAR · 雷达图</div>
          <RadarChart scores={result.scores ?? []} />
        </div>
      </div>

      {/* ══ ④ ANALYSIS ══ */}
      <div style={cardS()}>
        <div style={ctitS}>
          <span>ANALYSIS · AI分析详情（实时搜索 · 今日数据验证）</span>
          <button onClick={() => setShowTrend(v => !v)} style={{
            padding:'5px 16px',
            background:'linear-gradient(135deg,#005580,#0077aa)',
            border:'1.5px solid #00cfff', color:'#ffffff',
            borderRadius:4, cursor:'pointer', fontSize:11,
            fontFamily:'IBM Plex Mono,monospace', letterSpacing:'0.5px',
            fontWeight:600, boxShadow:'0 1px 6px rgba(0,207,255,0.25)',
          }}>
            📈 {showTrend ? '收起走势' : '90天走势'}
          </button>
        </div>
        <div style={{ fontSize:13, lineHeight:2.1, color:'var(--t)', whiteSpace:'pre-wrap' }}>
          {result.summary || '—'}
        </div>
        {result.analyses?.some(Boolean) && (
          <div style={{
            marginTop:12, padding:'10px 14px', backgroundColor:'var(--bg3)',
            borderLeft:'2px solid var(--c)', fontSize:11, color:'var(--t2)', lineHeight:1.8,
          }}>
            {result.analyses.map((a, i) => a ? (
              <div key={i} style={{ marginBottom:3 }}>
                <b style={{ color: i===0||i===4?'#00cfff':i===1||i===5?'#00e87a':i===2||i===6?'#ffd23f':i===3?'#a78bfa':'#ff2d55', fontWeight:500, fontFamily:'IBM Plex Mono,monospace' }}>
                  {DIM_ICONS[i]}{DIM_NAMES[i]}：
                </b>{a}
              </div>
            ) : null)}
          </div>
        )}
        <div style={{
          display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8,
          fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)',
          marginTop:14, paddingTop:12, borderTop:'1px solid var(--bd)',
        }}>
          <span>数据来源：Claude AI实时网络搜索</span>
          <span>分析时间：{new Date(result.createdAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</span>
        </div>
      </div>

      {/* 走勢図（サーバー経由） */}
      {showTrend && (
        <TrendPanel code={result.code} stopLoss={result.stopLoss} targetPrice={result.targetPrice}/>
      )}

      {/* ══ ⑤ RISK/REWARD ══ */}
      <div style={cardS('var(--g)')}>
        <div style={ctitS}>RISK / REWARD · 盈亏比</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
          {[
            { label:'当前价格', value:`¥${result.price.toFixed(2)}元`,  color:'var(--t)'  },
            { label:'建议止损', value:`¥${result.stopLoss}元`,          color:'var(--r)'  },
            { label:'目标价位', value:`¥${result.targetPrice}元`,       color:'var(--g)'  },
            { label:'盈亏比',   value: result.riskRatio || '—',         color: rrColor    },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ backgroundColor:'var(--bg3)', border:'1px solid var(--bd)', padding:14, textAlign:'center' }}>
              <div style={{ fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:8, fontFamily:'IBM Plex Mono,monospace' }}>{label}</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:19, fontWeight:700, color }}>{value}</div>
            </div>
          ))}
        </div>
        <RRBar price={result.price} stopLoss={result.stopLoss} targetPrice={result.targetPrice}/>
      </div>

      {/* ══ ⑥ POSITION CALC ══ */}
      <div style={cardS()}>
        <div style={ctitS}>
          <span>POSITION CALC · 止损仓位计算器</span>
          <span style={{ fontWeight:400, fontSize:8 }}>根据最大亏损额反推合理仓位</span>
        </div>
        <PositionCalc price={result.price} stopLoss={result.stopLoss}/>
      </div>

      {/* ══ ⑦ ACTION（AIテキスト使用）══ */}
      <div style={cardS()}>
        <div style={ctitS}>ACTION · 三段操作建议</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:14 }}>
          {[
            { label:'🎯 建仓策略（分批三步法）', text: result.actionEntry || `B分${result.totalScore.toFixed(2)}${result.totalScore >= 4.0 ? '，可按三步建仓，第一步30%' : '<4.0，建议观望，等待更强信号'}` },
            { label:'📊 持仓管理',              text: result.actionHold  || `止损¥${result.stopLoss}（提前埋好条件单）。浮盈≥5%可考虑第二步加仓。买入逻辑成立则持有，不因短期波动换仓` },
            { label:'⚠️ 风险提示（⑧维度约束）', text: result.actionRisk  || `⑧乖离：${biasLabel}。止损线：¥${result.stopLoss}（跌破无条件清仓）。月评连续两周B分<3.5则纳入轮换退出名单` },
          ].map(({ label, text }) => (
            <div key={label} style={{ backgroundColor:'var(--bg3)', border:'1px solid var(--bd)', padding:'14px 16px' }}>
              <div style={{ fontSize:9, color:'var(--t2)', letterSpacing:'1px', marginBottom:7, fontFamily:'IBM Plex Mono,monospace' }}>{label}</div>
              <div style={{ fontSize:12, lineHeight:1.9, color:'var(--t)' }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ ⑧ 持仓理由档案 ══ */}
      {isPort && (
        <div style={cardS('var(--g)')}>
          <div style={ctitS}>
            <span>📋 持仓理由档案 · 低频操作核心工具</span>
            <span style={{ fontWeight:400, fontSize:8 }}>填写后自动保存 · 换股前先看第③条</span>
          </div>
          <TradeLogicEdit code={result.code} stopLoss={result.stopLoss}/>
          <div style={{
            marginTop:10, padding:'8px 12px',
            backgroundColor:'rgba(0,232,122,0.05)', border:'1px solid rgba(0,232,122,0.2)',
            fontSize:11, color:'var(--t2)', lineHeight:1.9,
          }}>
            💡 <strong style={{ color:'var(--g)' }}>低频操作原则：</strong>
            每周复盘只问一件事——「我当初买它的理由，今天还成立吗？」成立→持有不动。不确定→不加仓不减仓，下周再看。不成立/止损触发→执行卖出，无条件。<br/>
            换股冲动来临时，先看第③条——大多数冲动会自然消失。
          </div>
        </div>
      )}
    </div>
  )
}


/* ── RadarChart ── */
function RadarChart