import { NextRequest } from 'next/server'
import { fetchMA20Bias } from '@/lib/eastmoney'
import { ok, err, withErrorHandler } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const { codes } = await req.json()
    if (!Array.isArray(codes) || codes.length === 0) {
      return err('请提供股票代码列表', 400, 'INVALID_REQUEST')
    }

    const data: Array<{
      code: string; ma20?: number; close?: number; bias?: number; error?: string
    }> = []

    for (const code of (codes as string[]).slice(0, 30)) {
      try {
        const result = await fetchMA20Bias(code)
        data.push({ code, ...result })
      } catch (e) {
        data.push({ code, error: String(e) })
      }
      // 300ms インターバル（東方財富 レート制限対策）
      await new Promise(r => setTimeout(r, 300))
    }

    return ok(data)
  })
}
