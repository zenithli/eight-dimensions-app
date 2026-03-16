import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
import { fetchKlineDaily } from '@/lib/eastmoney'

export async function GET(req: NextRequest) {
  try {
    const code  = req.nextUrl.searchParams.get('code') ?? ''
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '100')
    if (!/^\d{6}$/.test(code)) return err('无效代码', 400)
    const bars = await fetchKlineDaily(code, Math.min(limit, 220))
    return ok(bars)
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'K線取得失敗', 502)
  }
}
