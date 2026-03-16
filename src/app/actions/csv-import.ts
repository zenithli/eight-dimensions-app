'use server'

// src/app/actions/csv-import.ts
// CSV導入のdiff計算 — Server Action
// 純粋な計算処理で外部API呼び出しなし → Server Actionが適切

import { parsePortfolioCsv } from '@/lib/core/csv-parser'
import type { PortfolioItem, CsvDiffRow } from '@/types/domain'

export interface CsvImportResult {
  ok:      true
  diff:    CsvDiffRow[]
  added:   number
  updated: number
  skipped: number
  errors:  string[]
}

export interface CsvImportError {
  ok:    false
  error: string
}

export async function calcCsvImportDiff(
  csv: string,
  currentItems: PortfolioItem[]
): Promise<CsvImportResult | CsvImportError> {

  // CSV解析
  const parsed = parsePortfolioCsv(csv)
  if (!parsed.ok) {
    return { ok: false, error: parsed.error }
  }

  // diff計算（新增 / 更新成本 / 一致でスキップ）
  const diff: CsvDiffRow[] = []
  let added = 0, updated = 0, skipped = 0

  for (const row of parsed.rows) {
    const existing = currentItems.find(p => p.code === row.code)

    if (!existing) {
      diff.push({ ...row, status: 'new' })
      added++
    } else if (Math.abs(existing.cost - row.cost) > 0.005) {
      diff.push({ ...row, status: 'update', oldCost: existing.cost })
      updated++
    } else {
      diff.push({ ...row, status: 'same' })
      skipped++
    }
  }

  return {
    ok: true,
    diff,
    added,
    updated,
    skipped,
    errors: parsed.errors,
  }
}
