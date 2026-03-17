import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRealtimeQuote, fetchKlineDaily } from '@/lib/eastmoney'

// ── サーバーサイドキャッシュ（同日・同価格は再利用） ──
// Vercelサーバーレス: 同インスタンス内のみ有効（短期ブレ防止に有効）
const _cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30分

function cacheKey(code: string, price: number): string {
  const d = new Date().toLocaleDateString('zh-CN', { timeZone:'Asia/Shanghai' })
  return `${code}_${d}_${price.toFixed(2)}`
}

export async function POST(req: NextRequest) {
  try {
    const { code, apiKey, force } = await req.json()

    if (!apiKey) return err('请提供 API Key', 401, 'API_KEY_MISSING')
    if (!/^\d{6}$/.test(code)) return err('无效股票代码', 400, 'INVALID_CODE')

    // ① リアルタイム行情取得
    let quote
    try { quote = await fetchRealtimeQuote(code) }
    catch (e) { return err(`行情获取失败: ${e}`, 502, 'QUOTE_FAILED') }

    // ── キャッシュチェック（強制刷新でない限り当日同価格は再利用） ──
    const key = cacheKey(code, quote.price)
    if (!force) {
      const hit = _cache.get(key)
      if (hit && Date.now() - hit.ts < CACHE_TTL) {
        console.log(`[analyze] cache HIT: ${key}`)
        return ok({ ...(hit.data as object), _cached: true })
      }
    }


    // ② K線データ取得（MA5〜MA200、MA20乖離）タイムアウト8秒
    let ma5 = 0, ma10 = 0, ma20 = 0, ma60 = 0, ma120 = 0, ma200 = 0
    let ma20Bias = 0
    let bias200Data: Record<string,unknown> = { signal:'数据不足', ok: false }
    let maFetchLog = 'K線取得スキップ'
    try {
      const klinePromise = fetchKlineDaily(code, 220)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('K線タイムアウト(8s)')), 8000)
      )
      const bars = await Promise.race([klinePromise, timeoutPromise])
      if (bars.length >= 5) {
        const closes = bars.map(b => b.close)
        const maCalc = (n: number) => {
          if (closes.length < n) return 0
          const sl = closes.slice(-n)
          return +( sl.reduce((a, b) => a + b, 0) / n ).toFixed(3)
        }
        ma5   = maCalc(5)
        ma10  = maCalc(10)
        ma20  = maCalc(20)
        ma60  = maCalc(60)
        ma120 = maCalc(120)
        ma200 = maCalc(200)
        if (ma20 > 0) {
          ma20Bias = +((quote.price - ma20) / ma20 * 100).toFixed(2)
        }
        // ── BIAS200 標準化乖離（V6 calcBias200と同一ロジック）──
        if (bars.length >= 200 && ma200 > 0) {
          const closes = bars.map((b: {close:number}) => b.close)
          const b200 = (quote.price - ma200) / ma200 * 100
          const retSlice = closes.slice(-250)
          const dailyRets: number[] = []
          for (let i = 1; i < retSlice.length; i++)
            if (retSlice[i-1] > 0) dailyRets.push((retSlice[i]-retSlice[i-1])/retSlice[i-1])
          const mean2 = dailyRets.reduce((a,b)=>a+b,0)/dailyRets.length
          const annVol = Math.sqrt(dailyRets.reduce((a,b)=>a+(b-mean2)**2,0)/dailyRets.length)*Math.sqrt(250)*100
          const zScore = annVol > 0 ? b200/annVol : 0
          let ma200dir = '→'
          if (closes.length >= 205) {
            const m5ago = closes.slice(-205,-5).slice(-200).reduce((a,b)=>a+b,0)/200
            const diff = ma200 - m5ago
            ma200dir = diff > ma200*0.001 ? '↑' : diff < -ma200*0.001 ? '↓' : '→'
          }
          const absZ = Math.abs(zScore)
          const b200sig = b200 < 0
            ? (absZ>2.5?'🟢 超跌区间':absZ>1.5?'🔵 偏低':'⬜ 正常')
            : (absZ>2.5?'🔴 极端乖离':absZ>2.0?'🟠 乖离过大':absZ>1.5?'🟡 偏高':'⬜ 正常区间')
          // ⑤ 動的警戒線（過去1年BIAS200の80%分位）
          let dynWarn = 1.85
          const closesCopy = closes.slice()
          const bias200arr: number[] = []
          for (let ii = 199; ii < closesCopy.length; ii++) {
            const sl = closesCopy.slice(ii-199, ii+1)
            const ma = sl.reduce((a,b)=>a+b,0)/200
            const bv = annVol > 0 ? (closesCopy[ii]-ma)/ma*100/annVol : 0
            bias200arr.push(bv)
          }
          if (bias200arr.length >= 10) {
            const sorted = [...bias200arr].sort((a,b)=>a-b)
            const dw = sorted[Math.floor(sorted.length*0.8)]
            if (dw > 0 && dw < 10) dynWarn = +dw.toFixed(2)
          }
          bias200Data = {
            bias200Pct: b200.toFixed(1), annualVol: annVol.toFixed(1),
            zScore: zScore.toFixed(2), ma200val: ma200.toFixed(2),
            dynWarn: dynWarn.toFixed(2),
            ma200dir, signal: b200sig, ok: true
          }
        } else {
          bias200Data = { signal:'数据不足', detail:`需≥200日K线，当前${bars.length}本`, ok: false }
        }
        maFetchLog = `K線${bars.length}本 MA5=${ma5} MA20=${ma20} MA200=${ma200} 乖离=${ma20Bias}%`
      } else {
        maFetchLog = `K線不足(${bars.length}本)`
      }
    } catch (e) {
      maFetchLog = `K線失敗: ${e instanceof Error ? e.message : String(e)}`
      console.warn('[analyze] MA取得失敗:', maFetchLog)
    }

    // 換手率: V6と同様にf168フィールドから直接取得（APIが0の場合は概算）
    const turnoverPct = quote.turnoverPct > 0
      ? quote.turnoverPct
      : (() => {
          if (quote.volume > 0 && quote.price > 0) {
            const mv = quote.price * quote.volume
            return mv > 0 ? +( quote.amount / mv * 100 ).toFixed(2) : 0
          }
          return 0
        })()

    // ③ Claude AI 八维度分析
    const client = new Anthropic({ apiKey })
    const today = new Date().toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    })

    const maDesc = ma5 > 0
      ? `MA5=${ma5} MA10=${ma10} MA20=${ma20} MA60=${ma60} MA120=${ma120} MA200=${ma200}`
      : '均线数据获取中'

    const system = `你是专业A股量化分析师。今天是${today}。
只输出纯JSON，不含任何其他文字。

八维度评分（各1-5分）— B分=(①×2+②+③)/4 ± 奖惩：
①趋势共振（权重×2）：均线多头排列程度（MA5>MA10>MA20>MA60=5, 全空头=1）
②量能加速：量比≥2.0放量上涨=5;≥1.2放量上涨=4;缩量上涨=3;缩量下跌=2;放量下跌=1
③Alpha超额：6日涨幅-沪指同期，≥8%=5;≥4%=4.5;≥2%=4;≥0=3;负=2或1
④威科夫阶段：Spring底=5,积累=4,上涨推进=3,派发=2,下跌=1
⑤板块生态：板块近期排名前20%=5,后20%=1
⑥资金流向：量比>2且主力净流入=5;净流入=4;中性=3;净流出=2;大幅流出=1
⑦基本面锚：市值/估值/业绩质地，优质=5,普通=3,差=1
⑧乖离率控制：rise1m≤10%=5;10-20%=4;20-25%=3;25-35%=2;>35%=1（⑧评分仅供显示，B分惩罚由系统另算）

JSON格式（严格）：
{
  "name":"股票名称",
  "scores":[s1,s2,s3,s4,s5,s6,s7,s8],
  "analyses":["①详情","②详情","③详情","④详情","⑤详情","⑥详情","⑦详情","⑧详情"],
  "stopLoss":数字,
  "targetPrice":数字,
  "actionEntry":"建仓建议20字",
  "actionHold":"持仓策略20字",
  "actionRisk":"风险提示20字",
  "summary":"综合判断50字以内"
}`

    const userMsg = `分析${code}（${quote.name}）
价格：${quote.price}元  涨跌：${quote.changePct}%
量比：${quote.volRatio}  3日：${quote.rise3d}%  6日：${quote.rise6d}%  近月：${quote.rise1m}%
${maDesc}
MA20乖离率：${ma20Bias}%`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      temperature: 0,  // 決定論的出力（同じ入力→同じ出力に近づける）
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: userMsg }],
    })

    const textContent = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const jsonMatch = textContent.match(/\{[\s\S]+\}/)
    if (!jsonMatch) return err('AI返回格式异常', 500, 'AI_PARSE_ERROR')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let aiResult: Record<string, unknown>
    try {
      aiResult = JSON.parse(jsonMatch[0])
    } catch {
      try {
        const cleaned = jsonMatch[0]
          .replace(/[\x00-\x1F\x7F]/g, ' ')
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
        aiResult = JSON.parse(cleaned)
      } catch {
        aiResult = {
          scores: [3,3,3,3,3,3,3,3],
          stopLoss: parseFloat((quote.price * 0.92).toFixed(2)),
          targetPrice: parseFloat((quote.price * 1.15).toFixed(2)),
          summary: '技术面数据获取中，请稍后重试',
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ai = aiResult as any
    const scores: number[] = Array.isArray(ai.scores) ? ai.scores : [3,3,3,3,3,3,3,3]
    const trend = +(scores[0] ?? 3), vol2 = +(scores[1] ?? 3), alpha = +(scores[2] ?? 3)
    const baseB = +((trend * 2 + vol2 + alpha) / 4).toFixed(2)
    // V6: total = sum(①〜⑦) 最大35点（リング・RECENT表示用）
    const sumScore = scores.slice(0, 7).reduce((a: number, b: number) => a + b, 0)

    // ⑧乖離制御値: V6と同一 = 「近一月涨幅(rise1m)」を使用
    // V6: const biasMonth = poolStock.m1 → rise1m相当
    // ※MA20乖離(ma20Bias)は表示用に別途保持
    const biasVal = quote.rise1m ?? 0
    let totalScore = baseB
    const wyck = +(scores[3] ?? 3), sect = +(scores[4] ?? 3)
    if (wyck >= 4 && sect >= 4) totalScore += 0.15
    else if (wyck >= 3 && sect >= 4) totalScore += 0.08
    if      (biasVal > 35) totalScore = 0
    else if (biasVal > 30) totalScore -= 0.28
    else if (biasVal > 25) totalScore -= 0.18
    else if (biasVal > 20) totalScore -= 0.08
    else if (biasVal > 0 && biasVal <= 10) totalScore += 0.05
    totalScore = +Math.max(1, Math.min(5.5, totalScore)).toFixed(2)  // V6: Math.max(1,...)

    // 信号（V6と同じ判定）
    const signal =
      totalScore >= 4.5 ? '强力买入' :
      totalScore >= 4.0 ? '建议买入' :
      totalScore >= 3.5 ? '观望'     : '规避'

    const p = quote.price
    // V6準拠: 止損鉄底 = max(近10日最低×0.99, 現価×0.92) ≤ 8%
    // AIが返したstopLossが広すぎる場合（>8%）は×0.92で上書き
    const aiStopLoss = ai.stopLoss ?? 0
    const floorStop  = parseFloat((p * 0.92).toFixed(2))  // -8%鉄底
    const sl = aiStopLoss > 0 && aiStopLoss < p
      ? (((p - aiStopLoss) / p) > 0.08 ? floorStop : parseFloat(aiStopLoss.toFixed(2)))
      : floorStop
    const tp = ai.targetPrice ?? parseFloat((p * 1.15).toFixed(2))
    const riskReward = (p > sl && tp > p)
      ? `1:${((tp - p) / (p - sl)).toFixed(1)}`
      : '—'

    // ⑧乖離ラベル
    let biasLabel = '—', biasActionText = '三步法正常建仓·止损-8%'
    if      (biasVal > 35) { biasLabel = `+${biasVal.toFixed(0)}% ⛔过高`;  biasActionText = '⑧一票否决·禁止建仓' }
    else if (biasVal > 30) { biasLabel = `+${biasVal.toFixed(0)}% ⚠高危`;  biasActionText = '仅允许30%试仓·止损-5%' }
    else if (biasVal > 25) { biasLabel = `+${biasVal.toFixed(0)}% 警戒`;   biasActionText = '最多建仓30%·止损-5%' }
    else if (biasVal > 20) { biasLabel = `+${biasVal.toFixed(0)}% 注意`;   biasActionText = '最多建仓60%·止损-6%' }
    else if (biasVal > 10) { biasLabel = `+${biasVal.toFixed(0)}% 正常`;   biasActionText = '三步法正常建仓·止损-8%' }
    else if (biasVal > 0)  { biasLabel = `+${biasVal.toFixed(0)}% 低乖离`; biasActionText = '最佳入场窗口·止损-8%' }
    else if (biasVal < 0)  { biasLabel = `${biasVal.toFixed(0)}% 低位`;    biasActionText = '低乖离，可积极关注' }
    else                   { biasLabel = '数据不足' }

    const resultData = {
      code,
      name:        quote.name,
      price:       p,
      changePct:   quote.changePct,
      change:      quote.change,
      high:        quote.high,
      low:         quote.low,
      open:        quote.open,
      volume:      quote.volume,
      amount:      quote.amount,
      volRatio:    quote.volRatio,
      turnoverPct,
      // MA均線
      ma5, ma10, ma20, ma60, ma120, ma200,
      ma20Bias,
      bias200: bias200Data,
      biasLabel,
      biasActionText,
      // B分・信号
      sumScore,
      totalScore,
      signal,
      stopLoss:    sl,
      targetPrice: tp,
      riskRatio:   riskReward,
      // AI分析
      summary:     ai.summary ?? '',
      actionEntry: ai.actionEntry ?? '',
      actionHold:  ai.actionHold  ?? '',
      actionRisk:  ai.actionRisk  ?? '',
      scores: scores.map((s: number, i: number) => ({
        dim: i + 1,
        name: ['趋势共振','量能加速','Alpha超额','威科夫阶段','板块生态','资金流向','基本面锚'][i],
        score: s,
        analysis: ai.analyses?.[i] ?? '',
      })),
      analyses:  ai.analyses ?? [],
      createdAt: new Date().toISOString(),
      dataFreshness: 'today',
      // デバッグ情報（LOGパネル用）
      _debug: {
        maFetchLog,
        quotePrice: quote.price,
        quoteVolume: quote.volume,
        quoteAmount: quote.amount,
        quoteTurnoverPct: quote.turnoverPct,
      },
    }

    // DB保存（失敗しても無視）
    if (process.env.DATABASE_URL) {
      try {
        const { db } = await import('@/lib/db')
        if (!db) throw new Error('DB not initialized')
        await db.analysisHistory.create({ data: {
          code, name: resultData.name, price: p, changePct: quote.changePct,
          sumScore, totalScore, signal, stopLoss: sl, targetPrice: tp,
          riskRatio: riskReward, summary: resultData.summary,
          scoresJson: JSON.stringify(resultData.scores),
        }})
        await db.signalTrack.create({ data: {
          code, name: resultData.name, signal,
          bScore: totalScore, triggerPrice: p, outcome: 'open',
        }}).catch(() => {})
      } catch (dbErr) { console.warn('[analyze] DB保存スキップ:', dbErr) }
    }

    // キャッシュ保存
    _cache.set(key, { data: resultData, ts: Date.now() })
    console.log(`[analyze] cache SET: ${key}`)

    return ok(resultData)
  } catch (e: unknown) {
    console.error('[/api/analyze]', e)
    return err(e instanceof Error ? e.message : '服务器错误', 500)
  }
}
