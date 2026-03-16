'use client'
import { TrendPanel } from './TrendPanel'

import { useState } from 'react'
import type { AnalysisResult } from '@/types/domain'
import { getBSignal } from '@/lib/core/b-score'

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

function parseRR(rr: string): number {
  const m = rr?.match(/1:([\d.]+)/)
  return m ? parseFloat(m[1]) : 0
}

export function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const signal = getBSignal(result.totalScore)
  const rr     = parseRR(result.riskRatio)
  const pnlColor = result.changePct > 0 ? '#ff3a6e' : result.changePct < 0 ? '#00e87a' : 'var(--t3)'
  const rrColor  = rr >= 2 ? '#00e87a' : rr >= 1 ? '#f7c948' : '#ff3a6e'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

      {/* ── ヘッダー ── */}
      <div style={{
        position:'relative', backgroundColor:'var(--bg2)',
        border:'1px solid var(--bd)', borderRadius:12, overflow:'hidden',
      }}>
        {/* シグナル色ライン */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:2,
          background:`linear-gradient(90deg,transparent,${signal.color},transparent)`,
        }} />
        <div style={{ padding:20 }}>
          {/* 銘柄名 + B分 */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <h2 style={{ color:'var(--t)', fontWeight:700, fontSize:22 }}>{result.name}</h2>
                <span style={{ color:'var(--t3)', fontFamily:'IBM Plex Mono', fontSize:12 }}>{result.code}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontFamily:'IBM Plex Mono', color:'var(--t)', fontSize:18, fontWeight:700 }}>
                  ¥{result.price.toFixed(2)}
                </span>
                <span style={{ fontFamily:'IBM Plex Mono', fontSize:13, fontWeight:700, color:pnlColor }}>
                  {result.changePct > 0 ? '+' : ''}{result.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:48, fontWeight:900, lineHeight:1, color:signal.color }}>
                {result.totalScore.toFixed(2)}
              </div>
              <div style={{
                display:'inline-block', marginTop:4,
                fontFamily:'IBM Plex Mono', fontSize:11, padding:'3px 12px',
                border:`1px solid ${signal.color}`, borderRadius:4,
                color:signal.color, backgroundColor:`${signal.color}18`,
              }}>
                {result.signal}
              </div>
            </div>
          </div>

          {/* 止損・目標・盈亏比 */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10,
            marginTop:16, paddingTop:16, borderTop:'1px solid var(--bd)',
          }}>
            {[
              { label:'止损价', value:`¥${result.stopLoss}`,    color:'#ff3a6e' },
              { label:'目标价', value:`¥${result.targetPrice}`, color:'#00e87a' },
              { label:'盈亏比', value:result.riskRatio || '—',  color:rrColor   },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                backgroundColor:'var(--bg3)', borderRadius:8, padding:'10px', textAlign:'center',
              }}>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)', letterSpacing:'0.08em', marginBottom:4 }}>
                  {label}
                </div>
                <div style={{ fontFamily:'IBM Plex Mono', fontSize:13, fontWeight:700, color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── databar：行情データ（V6スタイル）── */}
      <div style={{
        backgroundColor:'var(--bg2)', border:'1px solid var(--bd)', borderRadius:12,
        padding:'12px 16px',
      }}>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))',
          gap:8,
        }}>
          {[
            { label:'今开',   value: result.open   ? `¥${result.open.toFixed(2)}`   : '—' },
            { label:'最高',   value: result.high   ? `¥${result.high.toFixed(2)}`   : '—', color:'var(--r)' },
            { label:'最低',   value: result.low    ? `¥${result.low.toFixed(2)}`    : '—', color:'var(--g)' },
            { label:'成交量', value: result.volume ? `${(result.volume/10000).toFixed(0)}万` : '—' },
            { label:'量比',   value: result.volRatio ? `${result.volRatio.toFixed(2)}x` : '—' },
            { label:'⑧乖离', value: result.ma20Bias != null ? `${result.ma20Bias.toFixed(1)}%` : (result.changePct != null ? `${result.changePct > 0 ? '+' : ''}${result.changePct.toFixed(1)}%` : '—'),
              color: (result.ma20Bias ?? 0) > 30 ? 'var(--r)' : (result.ma20Bias ?? 0) > 15 ? 'var(--y)' : 'var(--g)',
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              backgroundColor:'var(--bg3)', borderRadius:6, padding:'7px 10px',
            }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, color:'var(--t3)',
                letterSpacing:'0.08em', marginBottom:3 }}>{label}</div>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:12, fontWeight:700,
                color: color || 'var(--t)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 八维度スコアバー ── */}
      <div style={{
        backgroundColor:'var(--bg2)', border:'1px solid var(--bd)', borderRadius:12, padding:20,
      }}>
        <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, letterSpacing:'0.12em', color:'var(--t3)', marginBottom:16 }}>
          EIGHT DIMENSIONS · 八维度评分
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {DIM_META.map((meta, i) => {
            const sc  = result.scores?.[i]
            const score = sc?.score ?? 0
            const text  = sc?.analysis ?? result.analyses?.[i] ?? ''
            return (
              <DimRow key={i} {...meta} score={score} analysis={text} isLast={i === 7} />
            )
          })}
        </div>
      </div>

      {/* ── AI総合コメント ── */}
      {/* ── 走勢図パネル ── */}
      <TrendPanel
        code={result.code}
        stopLoss={result.stopLoss}
        targetPrice={result.targetPrice}
      />

      {result.summary && (
        <div style={{
          backgroundColor:'var(--bg2)', border:'1px solid var(--bd)', borderRadius:12, padding:20,
        }}>
          <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, letterSpacing:'0.12em', color:'var(--t3)', marginBottom:10 }}>
            AI SUMMARY · 综合判断
          </div>
          <p style={{ color:'var(--t)', fontSize:13, lineHeight:1.8 }}>{result.summary}</p>
        </div>
      )}
    </div>
  )
}

function DimRow({ icon, name, color, score, analysis, isLast }: {
  icon:string; name:string; color:string; score:number; analysis:string; isLast:boolean; [k:string]:unknown
}) {
  const [open, setOpen] = useState(false)
  const pct = (score / 5) * 100

  return (
    <div>
      <div
        onClick={() => analysis && setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:10,
          cursor: analysis ? 'pointer' : 'default',
          padding:'8px 0',
        }}
      >
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:12, width:18, flexShrink:0, color }}>{icon}</span>
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t2)', width:72, flexShrink:0 }}>{name}</span>
        <div style={{ flex:1, backgroundColor:'var(--bg3)', borderRadius:99, height:6, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:99,
            width:`${pct}%`, backgroundColor:color,
            transition:'width 0.7s ease',
          }} />
        </div>
        <span style={{ fontFamily:'IBM Plex Mono', fontSize:13, fontWeight:700, width:28, textAlign:'right', flexShrink:0, color }}>
          {score > 0 ? score.toFixed(1) : '—'}
        </span>
        {analysis && (
          <span style={{
            color:'var(--t3)', fontSize:10,
            transform: open ? 'rotate(180deg)' : 'none',
            transition:'transform 0.2s',
            flexShrink:0,
          }}>▾</span>
        )}
      </div>

      {open && analysis && (
        <div style={{
          marginBottom:4, marginLeft:28, paddingLeft:12,
          borderLeft:'2px solid var(--bd)',
          color:'var(--t2)', fontSize:11, lineHeight:1.8,
        }}>
          {analysis}
        </div>
      )}

      {!isLast && <div style={{ borderBottom:'1px solid rgba(56,200,255,0.06)' }} />}
    </div>
  )
}
