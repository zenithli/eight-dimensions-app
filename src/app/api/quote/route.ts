import { NextRequest } from 'next/server'
import { fetchRealtimeQuote } from '@/lib/eastmoney'
import { ok, err, withErrorHandler } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const { codes } = await req.json()
    if (!Array.isArray(codes) || codes.length === 0) {
      return err('请提供股票代码列表', 400, 'INVALID_REQUEST')
    }

    const targets = (codes as string[]).slice(0, 30)
    const results = await Promise.allSettled(
      targets.map(code => fetchRealtimeQuote(code))
    )

    const data = results.map((r, i) => {
      if (r.status === 'rejected') {
        return { code: targets[i], error: String(r.reason) }
      }
      const q = r.value
      return {
        code:      q.code,
        name:      q.name,
        price:     q.price,
        changePct: q.changePct,
        volRatio:  q.volRatio,
        rise3d:    q.rise3d,
        rise6d:    q.rise6d,
        rise1m:    q.rise1m,
        riseMon:   q.riseMon,
      }
    })

    return ok(data)
  })
}
