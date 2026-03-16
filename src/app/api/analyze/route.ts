import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRealtimeQuote } from '@/lib/eastmoney'

export async function POST(req: NextRequest) {
  try {
    const { code, apiKey } = await req.json()

    if (!apiKey) {
      return err('请提供 API Key', 401, 'API_KEY_MISSING')
    }
    if (!/^\d{6}$/.test(code)) {
      return err('无效股票代码', 400, 'INVALID_CODE')
    }

    // ① リアルタイム行情取得
    let quote
    try {
      quote = await fetchRealtimeQuote(code)
    } catch (e) {
      return err(`行情获取失败: ${e}`, 502, 'QUOTE_FAILED')
    }

    // ② Claude AI に八维度分析を依頼
    const client = new Anthropic({ apiKey })

    const today = new Date().toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    })

    const system = `你是专业A股量化分析师。今天是${today}。
你的任务：先搜索今日行情数据，再做八维度技术分析，最终只输出纯JSON，不含任何其他文字。

八维度评分（各1-5分）— 综合B分公式：(①×2+②+③)/4 + 持续奖励 − ⑧乖离惩罚：
①趋势共振（权重×2）：MA5>MA10>MA20>MA60>MA120=5，5轴全阳=5，完全空头排列=1
②量能加速：量比≥2.0放量上涨=5；量比≥1.2放量上涨=4；缩量上涨=3；缩量下跌=2；放量下跌=1
③Alpha超额：6日涨幅−沪指同期，≥8%=5；≥4%=4.5；≥2%=4；≥0=3；负数=2或1
④威科夫阶段：Spring底=5，积累=4，上涨推进=3，派发=2，下跌=1
⑤板块生态：所属板块近期表现排名（前20%=5，后20%=1）
⑥资金流向：量比>2且主力净流入=5；一般净流入=4；中性=3；净流出=2；大幅流出=1
⑦基本面锚：市值/估值/业绩，优质大市值=5，普通=3，差=1
⑧乖离率控制：由系统计算，你只输出①-⑦共7个评分

输出格式（严格JSON）：
{
  "name": "股票名称",
  "scores": [s1,s2,s3,s4,s5,s6,s7],
  "analyses": ["①分析","②分析","③分析","④分析","⑤分析","⑥分析","⑦分析"],
  "stopLoss": 数字,
  "targetPrice": 数字,
  "summary": "综合判断50字以内"
}`

    const userMsg = `分析股票 ${code}（${quote.name}）
当前价格：${quote.price}元，今日涨跌：${quote.changePct}%
量比：${quote.volRatio}，3日涨幅：${quote.rise3d}%，6日涨幅：${quote.rise6d}%
近一月涨幅：${quote.rise1m}%`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: userMsg }],
    })

    // レスポンス解析
    const textContent = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    // JSONを抽出（堅牢版）
    const jsonMatch = textContent.match(/\{[\s\S]+\}/)
    if (!jsonMatch) {
      return err('AI返回格式异常', 500, 'AI_PARSE_ERROR')
    }

    // JSON内の問題文字を修正してパース
    let aiResult: Record<string, unknown>
    try {
      // まずそのままパース
      aiResult = JSON.parse(jsonMatch[0])
    } catch {
      try {
        // 制御文字・不正な改行を除去してリトライ
        const cleaned = jsonMatch[0]
          .replace(/[\x00-\x1F\x7F]/g, ' ')  // 制御文字をスペースに
          .replace(/,\s*([}\]])/g, '$1')       // 末尾カンマを除去
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // キーをクォート
        aiResult = JSON.parse(cleaned)
      } catch {
        // それでも失敗したらデフォルト値を使用
        console.warn('[analyze] JSON解析失敗、デフォルト値使用:', jsonMatch[0].slice(0, 100))
        aiResult = {
          scores: [3, 3, 3, 3, 3, 3, 3],
          stopLoss: parseFloat((quote.price * 0.92).toFixed(2)),
          targetPrice: parseFloat((quote.price * 1.15).toFixed(2)),
          summary: '技术面数据获取中，请稍后重试',
        }
      }
    }

    // B分を計算（⑧次元はサーバー側で計算）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ai = aiResult as any
    const scores: number[] = Array.isArray(ai.scores) ? ai.scores : [3, 3, 3, 3, 3, 3, 3]
    const trend  = typeof scores[0] === 'number' ? scores[0] : 3
    const vol    = typeof scores[1] === 'number' ? scores[1] : 3
    const alpha  = typeof scores[2] === 'number' ? scores[2] : 3
    const baseB  = parseFloat(((trend * 2 + vol + alpha) / 4).toFixed(2))

    // ⑧乖離（m1推算、MA20計算は別エンドポイント）
    const bias = quote.rise1m ?? 0
    let totalScore = baseB
    if      (bias > 35) totalScore = 0
    else if (bias > 30) totalScore -= 0.28
    else if (bias > 25) totalScore -= 0.18
    else if (bias > 20) totalScore -= 0.08
    else if (bias > 0 && bias <= 10) totalScore += 0.05
    totalScore = parseFloat(Math.max(0, totalScore).toFixed(2))

    const signal =
      totalScore >= 4.5 ? '买入' :
      totalScore >= 4.0 ? '积极关注' :
      totalScore >= 3.5 ? '观望' : '规避'

    const riskReward = ai.stopLoss && ai.targetPrice
      ? `1:${((ai.targetPrice - quote.price) / (quote.price - ai.stopLoss)).toFixed(1)}`
      : '—'

    const resultData = {
      code,
      name:        quote.name,
      price:       quote.price,
      changePct:   quote.changePct,
      totalScore,
      signal,
      stopLoss:    ai.stopLoss    ?? parseFloat((quote.price * 0.92).toFixed(2)),
      targetPrice: ai.targetPrice ?? parseFloat((quote.price * 1.15).toFixed(2)),
      riskRatio:   riskReward,
      summary:     ai.summary ?? '',
      scores:      scores.map((s: number, i: number) => ({
        dim: i + 1,
        name: ['趋势共振','量能加速','Alpha超额','威科夫阶段','板块生态','资金流向','基本面锚'][i],
        score: s,
        analysis: ai.analyses?.[i] ?? '',
      })),
      analyses:  ai.analyses ?? [],
      createdAt: new Date().toISOString(),
    }

    // DB が設定されている場合のみ履歴保存 + 信号追跡
    if (process.env.DATABASE_URL) {
      try {
        const { db } = await import('@/lib/db')
        if (!db) throw new Error('DB not initialized')
        await db.analysisHistory.create({
          data: {
            code:        resultData.code,
            name:        resultData.name,
            price:       resultData.price,
            changePct:   resultData.changePct,
            totalScore:  resultData.totalScore,
            signal:      resultData.signal,
            stopLoss:    resultData.stopLoss,
            targetPrice: resultData.targetPrice,
            riskRatio:   resultData.riskRatio,
            summary:     resultData.summary,
            scoresJson:  JSON.stringify(resultData.scores),
          },
        })
        // 信号追跡を同時記録（失敗しても無視）
        await db.signalTrack.create({
          data: {
            code:         resultData.code,
            name:         resultData.name,
            signal:       resultData.signal,
            bScore:       resultData.totalScore,
            triggerPrice: resultData.price,
            outcome:      'open',
          },
        }).catch(() => {})
      } catch (dbErr) {
        console.warn('[analyze] DB保存スキップ:', dbErr)
      }
    }

    return ok(resultData)
  } catch (e: unknown) {
    console.error('[/api/analyze]', e)
    return err(e instanceof Error ? e.message : '服务器错误', 500)
  }
}
