// src/app/api/portfolio/import/route.ts
//
// ⚠️  Web App内部からは src/app/actions/csv-import.ts (Server Action) を使用
// このRoute Handlerは外部HTTP / スクリプト / 将来のモバイルアプリ用

import { NextRequest } from 'next/server'
import { parsePortfolioCsv } from '@/lib/core/csv-parser'
import { ok, err, withErrorHandler } from '@/lib/api-response'
import type { PortfolioItem, CsvDiffRow } from '@/types/domain'

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const { csv, currentItems } = await req.json() as {
      csv:          string
      currentItems: PortfolioItem[]
    }

    const parsed = parsePortfolioCsv(csv)
    if (!parsed.ok) return err(parsed.error, 400, 'CSV_PARSE_ERROR')

    const diff: CsvDiffRow[] = []
    let added = 0, updated = 0, skipped = 0

    for (const row of parsed.rows) {
      const existing = currentItems.find(p => p.code === row.code)
      if (!existing) {
        diff.push({ ...row, status: 'new' }); added++
      } else if (Math.abs(existing.cost - row.cost) > 0.005) {
        diff.push({ ...row, status: 'update', oldCost: existing.cost }); updated++
      } else {
        diff.push({ ...row, status: 'same' }); skipped++
      }
    }

    return ok({ diff, added, updated, skipped, errors: parsed.errors })
  })
}
