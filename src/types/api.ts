/**
 * types/api.ts
 *
 * API Routes のリクエスト / レスポンス型
 * フロントとバックエンドの契約
 */

import type { AnalysisResult, WatchlistStock, PortfolioItem, PriceAlert, HistoryEntry, CsvDiffRow } from './domain'

// ─────────────────────────────────────────
// 共通レスポンスラッパー
// ─────────────────────────────────────────
export interface ApiOk<T> {
  ok:   true
  data: T
}

export interface ApiError {
  ok:    false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiOk<T> | ApiError

// ─────────────────────────────────────────
// /api/analyze
// ─────────────────────────────────────────
export interface AnalyzeRequest {
  code:     string
  silent?:  boolean   // ログに残さない（プレビュー用）
}

export type AnalyzeResponse = ApiResponse<AnalysisResult>

// ─────────────────────────────────────────
// /api/quote  (リアルタイム行情)
// ─────────────────────────────────────────
export interface QuoteRequest {
  codes: string[]   // 最大30件
}

export interface QuoteItem {
  code:      string
  name:      string
  price:     number
  changePct: number
  volRatio:  number
  rise3d:    number
  rise6d:    number
  rise1m:    number
  riseMon:   number
}

export type QuoteResponse = ApiResponse<QuoteItem[]>

// ─────────────────────────────────────────
// /api/ma20  (MA20乖離バッチ)
// ─────────────────────────────────────────
export interface MA20Request {
  codes: string[]
}

export interface MA20Item {
  code:    string
  ma20:    number
  close:   number
  bias:    number
  error?:  string
}

export type MA20Response = ApiResponse<MA20Item[]>

// ─────────────────────────────────────────
// /api/pool
// ─────────────────────────────────────────
export type PoolGetResponse  = ApiResponse<WatchlistStock[]>
export type PoolSaveRequest  = { stocks: WatchlistStock[] }
export type PoolSaveResponse = ApiResponse<{ count: number }>

// ─────────────────────────────────────────
// /api/portfolio
// ─────────────────────────────────────────
export type PortfolioGetResponse  = ApiResponse<PortfolioItem[]>
export type PortfolioSaveRequest  = { items: PortfolioItem[] }
export type PortfolioSaveResponse = ApiResponse<{ count: number }>

// ─────────────────────────────────────────
// /api/portfolio/import  (CSV导入)
// ─────────────────────────────────────────
export interface PortfolioImportRequest {
  csv: string   // CSV生テキスト
}

export interface PortfolioImportResponse {
  ok:     boolean
  diff:   CsvDiffRow[]    // プレビュー用diff
  added:  number
  updated: number
  skipped: number
  errors:  string[]
}

// ─────────────────────────────────────────
// /api/alerts
// ─────────────────────────────────────────
export type AlertsGetResponse    = ApiResponse<PriceAlert[]>
export type AlertAddRequest      = Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>
export type AlertAddResponse     = ApiResponse<PriceAlert>

// ─────────────────────────────────────────
// /api/history
// ─────────────────────────────────────────
export type HistoryGetResponse = ApiResponse<HistoryEntry[]>
