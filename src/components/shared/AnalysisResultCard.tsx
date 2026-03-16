'use client'
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

/* ── 走勢図（サーバー経由 /api/kline）── */
interface KBar { date:string; close:number; high:number; low:number; vol:number; chg:number }

function TrendPanel({ code, stopLoss, targetPrice }: { code:string; stopLoss:number; targetPrice:number }) {
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)
  const [errMsg,  setErrMsg]  = useState('')
  const [data,    setData]    = useState<KBar[]>([])
  const priceRef = useRef<HTMLCanvasElement>(null)
  const biasRef  = useRef<HTMLCanvasElement>(null)
  const rrRef    = useRef<HTMLCanvasElement>(null)

  const draw = useCallback((bars: KBar[]) => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light'
    const bg   = dark ? '#0c1422' : '#f0f3f8'
    const line = dark ? '#00cfff' : '#0055cc'
    const grid = dark ? 'rgba(0,207,255,0.06)' : 'rgba(0,80,180,0.06)'
    const txt  = dark ? '#6a8faa' : '#4a6a8a'

    function setup(ref: React.RefObject<HTMLCanvasElement>, h: number) {
      const cv = ref.current; if (!cv) return null
      const dpr = window.devicePixelRatio || 1
      const W   = cv.parentElement?.clientWidth || 600
      cv.width  = W * dpr; cv.height = h * dpr
      cv.style.width = W + 'px'; cv.style.height = h + 'px'
      const ctx = cv.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, h)
      return { ctx, W, H: h }
    }

    const n = bars.length
    if (n < 2) return

    // 価格チャート (180px)
    const ps = setup(priceRef, 180)
    if (ps) {
      const { ctx, W, H } = ps
      const PAD = { t:16, r:20, b:28, l:64 }
      const gw = W - PAD.l - PAD.r, gh = H - PAD.t - PAD.b
      const prices = bars.map(d => d.close)
      const mn = Math.min(...prices, stopLoss, targetPrice) * 0.98
      const mx = Math.max(...prices, stopLoss, targetPrice) * 1.02
      const xS = (i:number) => PAD.l + i * (gw/(n-1))
      const yS = (v:number) => PAD.t + gh - (v-mn)/(mx-mn)*gh
      // グリッド
      ctx.strokeStyle = grid; ctx.lineWidth = 0.5
      const step = (mx-mn)/4
      for (let i=0; i<=4; i++) {
        const v = mn + step*i, y = yS(v)
        ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(W-PAD.r,y); ctx.stroke()
        ctx.fillStyle = txt; ctx.font = '9px IBM Plex Mono'
        ctx.textAlign = 'right'; ctx.fillText('¥'+v.toFixed(2), PAD.l-4, y+3)
      }
      // 止損線（赤破線）
      ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 1.5; ctx.setLineDash([5,3])
      ctx.beginPath(); ctx.moveTo(PAD.l, yS(stopLoss)); ctx.lineTo(W-PAD.r, yS(stopLoss)); ctx.stroke()
      ctx.fillStyle = '#ff2d55'; ctx.font = 'bold 9px IBM Plex Mono'; ctx.textAlign = 'left'
      ctx.fillText('止损'+stopLoss.toFixed(2), W-PAD.r+2, yS(stopLoss)+3)
      // 目標線（緑破線）
      ctx.strokeStyle = '#00e87a'
      ctx.beginPath(); ctx.moveTo(PAD.l, yS(targetPrice)); ctx.lineTo(W-PAD.r, yS(targetPrice)); ctx.stroke()
      ctx.fillStyle = '#00e87a'
      ctx.fillText('目标'+targetPrice.toFixed(2), W-PAD.r+2, yS(targetPrice)+3)
      ctx.setLineDash([])
      // 価格線
      ctx.strokeStyle = line; ctx.lineWidth = 1.5
      ctx.beginPath()
      prices.forEach((p, i) => i===0 ? ctx.moveTo(xS(i),yS(p)) : ctx.lineTo(xS(i),yS(p)))
      ctx.stroke()
      // 日付
      ctx.fillStyle = txt; ctx.font = '8px IBM Plex Mono'; ctx.textAlign = 'center'
      ctx.fillText(bars[0].date.slice(5), PAD.l, H-4)
      ctx.fillText(bars[n-1].date.slice(5), xS(n-1), H-4)
      ctx.fillText(bars[Math.floor(n/2)].date.slice(5), xS(Math.floor(n/2)), H-4)
    }

    // MA20乖離チャート (100px)
    const bs = setup(biasRef, 100)
    if (bs) {
      const { ctx, W, H } = bs
      const PAD = { t:14, r:20, b:22, l:52 }
      const gw = W - PAD.l - PAD.r, gh = H - PAD.t - PAD.b
      const closes = bars.map(b => b.close)
      const ma20s = closes.map((_, i) => {
        if (i < 19) return null
        return closes.slice(i-19, i+1).reduce((s,v)=>s+v,0)/20
      })
      const biases = bars.map((b, i) => {
        const ma = ma20s[i]
        return ma ? +((b.close-ma)/ma*100).toFixed(2) : null
      }).filter(v=>v!==null) as number[]
      if (biases.length < 2) return
      const off = bars.length - biases.length
      const mn = Math.min(-5, ...biases) - 2
      const mx = Math.max(35, ...biases) + 2
      const xS = (i:number) => PAD.l + (i+off)*(gw/(n-1))
      const yS = (v:number) => PAD.t + gh - (v-mn)/(mx-mn)*gh
      // ゼロライン
      ctx.strokeStyle = grid; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(PAD.l,yS(0)); ctx.lineTo(W-PAD.r,yS(0)); ctx.stroke()
      // 30%警戒線
      if (mx > 30) {
        ctx.strokeStyle = 'rgba(255,45,85,0.4)'; ctx.setLineDash([4,3])
        ctx.beginPath(); ctx.moveTo(PAD.l,yS(30)); ctx.lineTo(W-PAD.r,yS(30)); ctx.stroke()
        ctx.setLineDash([])
      }
      // 折れ線
      ctx.strokeStyle = '#ff8c35'; ctx.lineWidth = 1.5
      ctx.beginPath()
      biases.forEach((v,i) => i===0 ? ctx.moveTo(xS(i),yS(v)) : ctx.lineTo(xS(i),yS(v)))
      ctx.stroke()
      ctx.fillStyle = txt; ctx.font = '8px IBM Plex Mono'; ctx.textAlign = 'right'
      ctx.fillText('乖离%', PAD.l-3, PAD.t+gh/2)
      // 最新値ラベル
      const last = biases[biases.length-1]
      ctx.fillStyle = last > 30 ? '#ff2d55' : last > 20 ? '#ff8c35' : '#00e87a'
      ctx.textAlign = 'left'
      ctx.fillText(last.toFixed(1)+'%', W-PAD.r+2, yS(last)+3)
    }

    // RRチャート (80px)
    const rs = setup(rrRef, 80)
    if (rs) {
      const { ctx, W, H } = rs
      const PAD = { t:12, r:20, b:18, l:52 }
      const gw = W-PAD.l-PAD.r, gh = H-PAD.t-PAD.b
      const xS = (i:number) => PAD.l + i*(gw/(n-1))
      const yS = (v:number) => PAD.t + gh - Math.min(v,5)/5*gh
      const rrs = bars.map(b => {
        const reward = targetPrice - b.close
        const risk   = b.close - stopLoss
        return risk > 0 ? +(reward/risk).toFixed(2) : 0
      })
      // 背景（RR≥2の緑ゾーン）
      ctx.fillStyle = 'rgba(0,232,122,0.06)'
      ctx.fillRect(PAD.l, yS(5), gw, yS(2)-yS(5))
      // 基準2.0
      ctx.strokeStyle = 'rgba(0,232,122,0.4)'; ctx.lineWidth = 0.5; ctx.setLineDash([3,3])
      ctx.beginPath(); ctx.moveTo(PAD.l,yS(2)); ctx.lineTo(W-PAD.r,yS(2)); ctx.stroke()
      ctx.setLineDash([])
      // 折れ線
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5
      ctx.beginPath()
      rrs.forEach((v,i) => i===0 ? ctx.moveTo(xS(i),yS(v)) : ctx.lineTo(xS(i),yS(v)))
      ctx.stroke()
      ctx.fillStyle = txt; ctx.font = '8px IBM Plex Mono'; ctx.textAlign = 'right'
      ctx.fillText('R:R', PAD.l-3, PAD.t+gh/2)
    }
  }, [stopLoss, targetPrice])

  useEffect(() => {
    if (loaded && data.length > 0) setTimeout(() => draw(data), 50)
  }, [loaded, data, draw])

  async function handleLoad() {
    setLoading(true); setErrMsg('')
    try {
      // サーバーAPI経由（CORSなし）
      const res = await fetch(`/api/kline?code=${code}&limit=100`)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || '数据获取失败')
      const bars: KBar[] = (json.data || []).map((b: {date:string;open:number;close:number;high:number;low:number;volume:number;changePct:number}) => ({
        date: b.date, close: b.close, high: b.high, low: b.low,
        vol: b.volume, chg: b.changePct,
      }))
      if (bars.length === 0) throw new Error('暂无K线数据')
      setData(bars); setLoaded(true)
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : '加载失败')
    } finally { setLoading(false) }
  }

  const hdrS: React.CSSProperties = {
    fontFamily:'IBM Plex Mono,monospace', fontSize:9, letterSpacing:'0.12em',
    color:'var(--t3)', textTransform:'uppercase',
  }
  const btnS: React.CSSProperties = {
    fontFamily:'IBM Plex Mono,monospace', fontSize:10, padding:'4px 12px',
    border:'1px solid rgba(0,207,255,0.3)', borderRadius:4,
    cursor:'pointer', color:'var(--c)', backgroundColor:'transparent',
  }

  return (
    <div style={{ backgroundColor:'var(--bg2)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--bd)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={hdrS}>📈 90天价格走势 · 止损/目标追踪</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {errMsg && <span style={{ fontSize:10, color:'var(--r)' }}>{errMsg}</span>}
          <button onClick={handleLoad} disabled={loading} style={btnS}>
            {loading ? '⟳ 加载中…' : loaded ? '↻ 刷新' : '📈 载入走势图'}
          </button>
        </div>
      </div>
      {loaded && (
        <div style={{ padding:'12px 16px' }}>
          <div style={{ marginBottom:10 }}>
            <div style={{ ...hdrS, marginBottom:4, fontSize:8 }}>
              PRICE · 价格走势 · <span style={{color:'#ff2d55'}}>── 止损</span> · <span style={{color:'#00e87a'}}>── 目标</span>
            </div>
            <div style={{ width:'100%', height:180 }}><canvas ref={priceRef} style={{ width:'100%', height:'100%' }}/></div>
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={{ ...hdrS, marginBottom:4, fontSize:8 }}>⑧ 乖离率 · 买入安全边际</div>
            <div style={{ width:'100%', height:100 }}><canvas ref={biasRef} style={{ width:'100%', height:'100%' }}/></div>
          </div>
          <div>
            <div style={{ ...hdrS, marginBottom:4, fontSize:8 }}>盈亏比 R:R · <span style={{color:'rgba(0,232,122,0.6)'}}>绿区=≥2.0</span></div>
            <div style={{ width:'100%', height:80 }}><canvas ref={rrRef} style={{ width:'100%', height:'100%' }}/></div>
          </div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:8, color:'var(--t3)', marginTop:6 }}>
            共 {data.length} 根K线 · 止损¥{stopLoss.toFixed(2)} · 目标¥{targetPrice.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── RadarChart ── */
function RadarChart({ scores }: { scores: Array<{ score: number }> }) {
  const cx=120,cy=120,r=90,n=7
  const labels=['热势','量价','Alpha','威科夫','板块','资金','基本']
  const angle = (i:number) => (i/n)*2*Math.PI - Math.PI/2
  const pt    = (i:number,v:number): [number,number] => [cx+((v/5)*r)*Math.cos(angle(i)), cy+((v/5)*r)*Math.sin(angle(i))]
  const vals  = scores.slice(0,7).map(s=>s?.score??0)
  return (
    <svg width="240" height="240" viewBox="0 0 240 240" style={{ display:'block', margin:'0 auto' }}>
      {[1,2,3,4,5].map(g=><polygon key={g} fill="none" stroke="rgba(0,207,255,0.08)" strokeWidth="0.5" points={Array.from({length:n},(_,i)=>pt(i,g).join(',')).join(' ')}/>)}
      {Array.from({length:n},(_,i)=><line key={i} x1={cx} y1={cy} x2={pt(i,5)[0]} y2={pt(i,5)[1]} stroke="rgba(0,207,255,0.06)" strokeWidth="0.5"/>)}
      <polygon fill="rgba(0,207,255,0.12)" stroke="#00cfff" strokeWidth="1.5" points={vals.map((v,i)=>pt(i,v).join(',')).join(' ')}/>
      {labels.map((label,i)=>{const[x,y]=pt(i,5.8);return<text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontFamily="IBM Plex Mono,monospace" fill="var(--t2)">{label}</text>})}
    </svg>
  )
}

/* ── RRBar ── */
function RRBar({ price,stopLoss,targetPrice }:{price:number;stopLoss:number;targetPrice:number}) {
  const risk=price-stopLoss, reward=targetPrice-price, total=risk+reward
  if (total<=0||risk<=0) return null
  const rW=(risk/total)*100, reW=(reward/total)*100, rr=reward/risk
  return (
    <div>
      <div style={{ height:10, borderRadius:5, overflow:'hidden', backgroundColor:'var(--bg3)', display:'flex', marginBottom:6 }}>
        <div style={{ width:`${rW}%`, backgroundColor:'var(--r)', transition:'width 1.2s ease' }}/>
        <div style={{ width:`${reW}%`, backgroundColor:'var(--g)', transition:'width 1.2s ease' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'IBM Plex Mono,monospace', fontSize:9, color:'var(--t2)' }}>
        <span style={{color:'var(--r)'}}>止损 -{risk.toFixed(2)}元 ({rW.toFixed(0)}%)</span>
        <span style={{color:rr>=2?'var(--g)':rr>=1?'var(--y)':'var(--r)'}}>1:{rr.toFixed(1)}</span>
        <span style={{color:'var(--g)'}}>+{reward.toFixed(2)}元 ({reW.toFixed(0)}%)</span>
      </div>
    </div>
  )
}

/* ── PositionCalc ── */
function PositionCalc({ price,stopLoss }:{price:number;stopLoss:number}) {
  const [capital,setCapital]=useState('1000000')
  const [maxLoss,setMaxLoss]=useState('2')
  const cap=parseFloat(capital||'0'), ml=parseFloat(maxLoss||'0')
  const maxLossAmt=cap*ml/100, riskPS=price-stopLoss
  const maxShares=riskPS>0?Math.floor(maxLossAmt/riskPS/100)*100:0
  const posAmt=maxShares*price
  const posRatio=cap>0?posAmt/cap*100:0
  const posColor=posRatio>50?'var(--r)':posRatio>30?'var(--y)':'var(--g)'
  const inp:React.CSSProperties={
    backgroundColor:'var(--bg3)',border:'1px solid var(--bd2)',color:'var(--t)',
    fontFamily:'IBM Plex Mono,monospace',fontSize:12,padding:'9px 12px',
    outline:'none',width:'100%',transition:'border 0.2s',
  }
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
        <div>
          <div style={{fontSize:9,color:'var(--t2)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'1px',marginBottom:6}}>总资金（元）</div>
          <input type="number" value={capital} onChange={e=>setCapital(e.target.value)} style={inp}/>
        </div>
        <div>
          <div style={{fontSize:9,color:'var(--t2)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'1px',marginBottom:6}}>最大亏损（%）</div>
          <input type="number" value={maxLoss} onChange={e=>setMaxLoss(e.target.value)} style={inp}/>
        </div>
        <div>
          <div style={{fontSize:9,color:'var(--t2)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'1px',marginBottom:6}}>止损价 / 入场价</div>
          <div style={{...inp,color:'var(--t2)'}}>¥{stopLoss.toFixed(2)} / ¥{price.toFixed(2)}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:8}}>
        {[
          {label:'每股风险', val:`¥${riskPS.toFixed(2)}`,color:'var(--r)'},
          {label:'最大持股数',val:`${maxShares.toLocaleString()}股`,color:'var(--c)'},
          {label:'建仓金额', val:`¥${posAmt.toLocaleString(undefined,{maximumFractionDigits:0})}`,color:'var(--y)'},
          {label:'仓位比例', val:`${posRatio.toFixed(1)}%`,color:posColor},
        ].map(({label,val,color})=>(
          <div key={label} style={{backgroundColor:'var(--bg3)',border:'1px solid rgba(0,207,255,0.15)',padding:'10px 12px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'var(--t2)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'1px',marginBottom:4}}>{label}</div>
            <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:16,fontWeight:700,color}}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{height:5,backgroundColor:'var(--bg3)',borderRadius:3,overflow:'hidden',marginBottom:5}}>
        <div style={{height:'100%',width:`${Math.min(posRatio,100)}%`,backgroundColor:posColor,transition:'width 0.4s',borderRadius:3}}/>
      </div>
      {posRatio>50&&<div style={{fontSize:9,color:'var(--r)',fontFamily:'IBM Plex Mono,monospace',marginTop:3}}>⚠ 仓位超过50%，注意融资风险</div>}
      <div style={{fontSize:9,color:'var(--t2)',fontFamily:'IBM Plex Mono,monospace',marginTop:5}}>公式：最大亏损额 ÷ 每股风险 → 最大A股 · 100股取整</div>
    </div>
  )
}

/* ── TradeLogicEdit ── */
function TradeLogicEdit({ code,stopLoss }:{code:string;stopLoss:number}) {
  const key=`logic_${code}`
  const [data,setData]=useState({why:'',sell:'',no:''})
  const [saved,setSaved]=useState(false)
  useEffect(()=>{
    try{const r=localStorage.getItem(key);if(r)setData(JSON.parse(r))}catch{}
  },[key])
  function autoSave(next:typeof data){
    try{localStorage.setItem(key,JSON.stringify({...next,ts:Date.now()}))}catch{}
    setSaved(true); setTimeout(()=>setSaved(false),1500)
  }
  function handleChange(field:keyof typeof data,val:string){
    const next={...data,[field]:val}
    setData(next); autoSave(next)
  }
  const ta:React.CSSProperties={
    width:'100%',background:'var(--bg3)',color:'var(--t)',
    fontFamily:'Noto Sans SC,sans-serif',fontSize:11,
    padding:'8px 10px',resize:'vertical',outline:'none',lineHeight:1.7,
  }
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
        <div>
          <div style={{fontSize:9,color:'var(--g)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'2px',marginBottom:6}}>① 买入理由（3个月逻辑）</div>
          <textarea rows={4} value={data.why} onChange={e=>handleChange('why',e.target.value)}
            placeholder="例：中东战争→煤炭供给紧张→价格中期看涨；股息率7%保底；逻辑有效期至战争结束"
            style={{...ta,border:'1px solid var(--bd2)'}}/>
        </div>
        <div>
          <div style={{fontSize:9,color:'var(--r)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'2px',marginBottom:6}}>② 卖出条件（提前写死）</div>
          <textarea rows={4} value={data.sell} onChange={e=>handleChange('sell',e.target.value)}
            placeholder={`止损：跌破¥${stopLoss.toFixed(2)}（成本×0.92）\n逻辑破坏：___发生时卖出\n月评：连续两周B<3.5`}
            style={{...ta,border:'1px solid rgba(255,45,85,0.3)'}}/>
        </div>
        <div>
          <div style={{fontSize:9,color:'var(--y)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'2px',marginBottom:6}}>③ 不会因以下原因卖（预判情绪陷阱）</div>
          <textarea rows={4} value={data.no} onChange={e=>handleChange('no',e.target.value)}
            placeholder="· B分从5.0短期降到4.3&#10;· 大盘调整带动被动下跌&#10;· 看到其他标的涨得更多&#10;· 短期消息面扰动"
            style={{...ta,border:'1px solid rgba(255,210,63,0.3)'}}/>
        </div>
      </div>
      {saved&&<div style={{marginTop:6,fontSize:9,color:'var(--g)',fontFamily:'IBM Plex Mono,monospace',textAlign:'right'}}>✓ 已自动保存</div>}
    </div>
  )
}
