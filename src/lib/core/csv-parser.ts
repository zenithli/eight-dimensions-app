/**
 * lib/core/csv-parser.ts
 *
 * CSV解析 — 純粋関数
 * 移植自 csvParseRaw() + splitCSV()
 * DOM不依存、FileReader不依存（文字列を受け取るだけ）
 */

export interface CsvPortfolioRow {
  code:   string
  name:   string
  cost:   number
  qty:    number
  price:  number
  rowNum: number
}

export interface CsvParseSuccess {
  ok:     true
  rows:   CsvPortfolioRow[]
  errors: string[]          // スキップした行の理由
}

export interface CsvParseFailure {
  ok:     false
  error:  string            // 致命的エラー
}

export type CsvParseResult = CsvParseSuccess | CsvParseFailure

// ─────────────────────────────────────────
// メイン解析関数
// ─────────────────────────────────────────
export function parsePortfolioCsv(raw: string): CsvParseResult {
  // BOM除去
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw

  const lines = cleaned
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim())

  if (lines.length < 2) {
    return { ok: false, error: '内容至少需要表头行+1条数据' }
  }

  const sep = lines[0].includes('\t') ? '\t' : ','
  const headers = splitCsv(lines[0], sep)

  // 必須列マッピング（华泰証券の複数バリアント対応）
  const COL_CODE  = ['证券代码', '股票代码', '代码']
  const COL_NAME  = ['证券名称', '股票名称', '名称']
  const COL_COST  = ['成本价', '成本均价', '平均成本', '买入成本', '成本']
  const COL_QTY   = ['持仓数量', '可用数量', '数量']
  const COL_PRICE = ['最新价', '现价', '收盘价']

  const idxCode  = findCol(COL_CODE,  headers)
  const idxName  = findCol(COL_NAME,  headers)
  const idxCost  = findCol(COL_COST,  headers)
  const idxQty   = findCol(COL_QTY,   headers)
  const idxPrice = findCol(COL_PRICE, headers)

  const missing: string[] = []
  if (idxCode  < 0) missing.push('证券代码')
  if (idxName  < 0) missing.push('证券名称')
  if (idxCost  < 0) missing.push('成本价/成本均价')

  if (missing.length > 0) {
    return { ok: false, error: `缺少必填列：${missing.join('、')}` }
  }

  const rows:   CsvPortfolioRow[] = []
  const errors: string[]          = []

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsv(lines[i], sep)
    if (cells.length < 3) continue

    // コード（6桁になるよう前ゼロ補完）
    const rawCode = (cells[idxCode] ?? '').replace(/\s/g, '').padStart(6, '0')
    if (!/^\d{6}$/.test(rawCode)) {
      errors.push(`第${i + 1}行代码不合法: ${cells[idxCode]}`)
      continue
    }

    // 名称
    const name = (cells[idxName] ?? rawCode).trim()

    // 成本价（千分位カンマ除去）
    const costStr = (cells[idxCost] ?? '0').replace(/,/g, '')
    const cost    = parseFloat(costStr)
    if (isNaN(cost) || cost <= 0) {
      errors.push(`第${i + 1}行成本价无效: ${cells[idxCost]}`)
      continue
    }

    // 数量・現値（オプション）
    const qty =
      idxQty >= 0 && cells[idxQty]
        ? parseInt(cells[idxQty].replace(/,/g, ''), 10) || 0
        : 0

    const price =
      idxPrice >= 0 && cells[idxPrice]
        ? parseFloat(cells[idxPrice].replace(/,/g, '')) || 0
        : 0

    rows.push({ code: rawCode, name, cost, qty, price, rowNum: i + 1 })
  }

  if (rows.length === 0) {
    const errMsg = errors.length
      ? `未解析到有效数据行。错误：${errors.slice(0, 3).join(' / ')}`
      : '未解析到有效数据行'
    return { ok: false, error: errMsg }
  }

  return { ok: true, rows, errors }
}

// ─────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────

// 引号内カンマを正しく処理するCSV分割
function splitCsv(line: string, sep: string): string[] {
  if (sep === '\t') {
    return line.split('\t').map((c) => c.trim().replace(/^"|"$/g, ''))
  }
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue }
    if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  result.push(cur.trim())
  return result
}

function findCol(aliases: string[], headers: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex(
      (h) => h.includes(alias) || alias.includes(h)
    )
    if (idx >= 0) return idx
  }
  return -1
}

// ─────────────────────────────────────────
// CSVテンプレート生成（ダウンロード用）
// ─────────────────────────────────────────
export function generateTemplateCsv(): string {
  const header = '证券代码,证券名称,成本价,持仓数量,最新价'
  const rows = [
    '000815,美利云,17.92,21900,18.84',
    '159326,电网ETF,2.11,212500,2.077',
    '601225,陕西煤业,27.00,10000,27.00',
    '002371,北方华创,521.67,1434,457.99',
  ]
  return [header, ...rows].join('\n')
}
