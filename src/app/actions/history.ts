'use server'

// src/app/actions/history.ts
import { db } from '@/lib/db'
import type { AnalysisResult, HistoryEntry } from '@/types/domain'

function requireDb() {
  if (!db) throw new Error('DATABASE_URL が設定されていません')
  return db
}

export async function saveAnalysis(result: AnalysisResult): Promise<void> {
  const client = requireDb()
  await client.analysisHistory.create({
    data: {
      code:        result.code,
      name:        result.name,
      price:       result.price,
      changePct:   result.changePct,
      totalScore:  result.totalScore,
      signal:      result.signal,
      stopLoss:    result.stopLoss,
      targetPrice: result.targetPrice,
      riskRatio:   result.riskRatio,
      summary:     result.summary,
      scoresJson:  JSON.stringify(result.scores ?? []),
    },
  })
}

export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  const client = requireDb()
  const rows = await client.analysisHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })
  return rows.map(r => ({
    id:          r.id,
    code:        r.code,
    name:        r.name,
    price:       r.price,
    changePct:   r.changePct,
    totalScore:  r.totalScore,
    signal:      r.signal,
    stopLoss:    r.stopLoss ?? undefined,
    targetPrice: r.targetPrice ?? undefined,
    riskRatio:   r.riskRatio,
    summary:     r.summary,
    scoresJson:  r.scoresJson,
    createdAt:   r.createdAt.toISOString(),
  }))
}

export async function getHistoryByCode(code: string, limit = 20): Promise<HistoryEntry[]> {
  const client = requireDb()
  const rows = await client.analysisHistory.findMany({
    where:   { code },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })
  return rows.map(r => ({
    id:          r.id,
    code:        r.code,
    name:        r.name,
    price:       r.price,
    changePct:   r.changePct,
    totalScore:  r.totalScore,
    signal:      r.signal,
    stopLoss:    r.stopLoss ?? undefined,
    targetPrice: r.targetPrice ?? undefined,
    riskRatio:   r.riskRatio,
    summary:     r.summary,
    scoresJson:  r.scoresJson,
    createdAt:   r.createdAt.toISOString(),
  }))
}

export async function clearHistory(): Promise<{ count: number }> {
  const client = requireDb()
  const result = await client.analysisHistory.deleteMany()
  return { count: result.count }
}
