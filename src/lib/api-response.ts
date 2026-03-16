/**
 * src/lib/api-response.ts
 *
 * API Routes 共通レスポンスヘルパー
 * 全 Route Handler でこれを使うことでレスポンス形式を統一する
 */

import { NextResponse } from 'next/server'

export interface ApiOk<T> {
  ok:   true
  data: T
}

export interface ApiError {
  ok:    false
  error: string
  code?: string  // エラーコード（例: 'INVALID_CODE', 'API_KEY_MISSING'）
}

export type ApiResult<T> = ApiOk<T> | ApiError

// ── 成功レスポンス ──
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data } satisfies ApiOk<T>, { status })
}

// ── エラーレスポンス ──
export function err(
  error: string,
  status = 500,
  code?: string
): NextResponse {
  return NextResponse.json(
    { ok: false, error, ...(code ? { code } : {}) } satisfies ApiError,
    { status }
  )
}

// ── エラーを catch して err() に変換するラッパー ──
export async function withErrorHandler(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn()
  } catch (e: unknown) {
    console.error('[API Error]', e)
    const message = e instanceof Error ? e.message : 'サーバーエラー'
    // Prisma エラーの分類
    if (message.includes('DATABASE_URL')) {
      return err('データベース未設定', 503, 'DB_NOT_CONFIGURED')
    }
    if (message.includes('connect ECONNREFUSED')) {
      return err('データベース接続失敗', 503, 'DB_CONNECTION_FAILED')
    }
    return err(message, 500)
  }
}
