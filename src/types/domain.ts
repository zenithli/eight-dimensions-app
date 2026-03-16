/**
 * types/domain.ts
 *
 * ドメインオブジェクト型定義
 * 「一つの持仓はどういう形か」「分析結果はどういう形か」
 * — ここがフロント・バック・DBの契約
 */

// ─────────────────────────────────────────
// 持仓（ポートフォリオ）
// ─────────────────────────────────────────
export interface PortfolioItem {
  code:  string   // 6桁
  name:  string
  cost:  number   // 成本価
  price: number   // 現在値（取得済みなら）
  qty:   number   // 保有株数
  role:  string   // 进攻矛①/ETF盾牌① など
  logic?: TradeLogic
}

export interface TradeLogic {
  whyBuy:         string  // 买入理由
  sellCondition:  string  // 卖出条件
  notSell:        string  // 不会因以下原因卖
  updatedAt?:     string
}

// ─────────────────────────────────────────
// 自選株
// ─────────────────────────────────────────
export type StockTier = 'core' | 'steady' | 'defense' | 'watch'

export const TIER_LABEL: Record<StockTier, string> = {
  core:    '核心进攻',
  steady:  '稳健跟随',
  defense: '防御补充',
  watch:   '观察候补',
}

export interface WatchlistStock {
  code:      string
  name:      string
  tier:      StockTier
  cost:      number
  addDate:   string   // "2026/03/13"

  // 行情スナップショット（最終更新）
  price:     number
  chg:       number   // 当日%
  d3:        number
  d6:        number
  m1:        number
  mon:       number
  volr:      number
  ma20Bias?: number | null   // 真実MA20乖離（null=未計算）
  ma20?:     number | null
  bScore:    number   // 综合B分
  dataMode?: string   // 'realtime' | 'close' | ''
  updatedAt?: string
}

// ─────────────────────────────────────────
// リアルタイム行情
// ─────────────────────────────────────────
export interface RealtimeQuote {
  code:       string
  name:       string
  price:      number
  changePct:  number
  change:     number
  rise3d:     number
  rise6d:     number
  rise1m:     number
  riseMon:    number
  volRatio:   number
  volume:     number
  amount:     number
  high:       number
  low:        number
  open:       number
  prevClose:  number
  turnover:   number
  pe:         number
  pb:         number
}

// ─────────────────────────────────────────
// K線バー
// ─────────────────────────────────────────
export interface KlineBar {
  date:       string
  open:       number
  close:      number
  high:       number
  low:        number
  volume:     number
  amount:     number
  change:     number
  changePct:  number
  ma5?:       number | null
  ma10?:      number | null
  ma20?:      number | null
  ma60?:      number | null
}

// ─────────────────────────────────────────
// AI分析結果
// ─────────────────────────────────────────
export interface DimScore {
  dim:      number   // 1–8
  name:     string
  score:    number   // 1–5
  analysis: string
}

export interface AnalysisResult {
  code:           string
  name:           string
  price:          number
  changePct:      number
  totalScore:     number      // 综合B分
  change?:        number
  high?:          number
  low?:           number
  open?:          number
  volume?:        number
  amount?:        number
  volRatio?:      number
  turnoverPct?:   number      // 換手率%
  // MA均線
  ma5?:           number
  ma10?:          number
  ma20?:          number
  ma60?:          number
  ma120?:         number
  ma200?:         number
  ma20Bias?:      number      // MA20乖離率（%）
  biasLabel?:     string      // 乖離ラベル（+22% 注意 など）
  biasActionText?: string     // 乖離操作建議
  signal:         string
  stopLoss:       number
  targetPrice:    number
  riskRatio:      string
  summary:        string
  actionEntry?:   string      // 建仓策略
  actionHold?:    string      // 持仓管理
  actionRisk?:    string      // 风险提示
  scores:         DimScore[]
  analyses:       string[]
  createdAt:      string
  dataFreshness?: string      // 'today' | 'yesterday' | 'unknown'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _debug?:        Record<string, any>  // デバッグ情報
  _cached?:       boolean              // キャッシュから取得
  _cachedAt?:     string               // キャッシュ保存時刻
}

// ─────────────────────────────────────────
// 価格アラート
// ─────────────────────────────────────────
export interface PriceAlert {
  id?:         number
  code:        string
  name:        string
  alertType:   'above' | 'below'
  price:       number
  triggered:   boolean
  createdAt?:  string
}

// ─────────────────────────────────────────
// 分析履歴（ログ）
// ─────────────────────────────────────────
export interface HistoryEntry {
  id:           number
  code:         string
  name:         string
  price:        number
  changePct:    number
  totalScore:   number
  signal:       string
  stopLoss?:    number
  targetPrice?: number
  riskRatio:    string
  summary?:     string      // AI総合コメント
  scoresJson?:  string      // DimScore[] JSON文字列
  createdAt:    string
}

// ─────────────────────────────────────────
// CSV導入のdiff結果
// ─────────────────────────────────────────
export type CsvRowStatus = 'new' | 'update' | 'same'

export interface CsvDiffRow {
  code:      string
  name:      string
  cost:      number
  qty:       number
  price:     number
  status:    CsvRowStatus
  oldCost?:  number   // status=updateの場合
}
