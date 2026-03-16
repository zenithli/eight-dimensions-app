'use server'

// src/app/actions/portfolio.ts
import { db } from '@/lib/db'
import type { PortfolioItem, TradeLogic } from '@/types/domain'

function requireDb() {
  if (!db) throw new Error('DATABASE_URL が設定されていません。.env.local を確認してください。')
  return db
}

export async function getPortfolio(): Promise<PortfolioItem[]> {
  const client = requireDb()
  const rows = await client.portfolio.findMany({
    include: { logic: true },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(r => ({
    code:  r.code,
    name:  r.name,
    cost:  r.cost,
    price: 0,
    qty:   r.qty,
    role:  r.role,
    logic: r.logic ? {
      whyBuy:        r.logic.whyBuy,
      sellCondition: r.logic.sellCondition,
      notSell:       r.logic.notSell,
      updatedAt:     r.logic.updatedAt.toISOString(),
    } : undefined,
  }))
}

export async function savePortfolio(
  items: Pick<PortfolioItem, 'code' | 'name' | 'cost' | 'qty' | 'role'>[]
): Promise<{ count: number }> {
  const client = requireDb()
  const results = await client.$transaction(
    items.map(item =>
      client.portfolio.upsert({
        where:  { code: item.code },
        create: { code: item.code, name: item.name, cost: item.cost, qty: item.qty, role: item.role },
        update: { name: item.name, cost: item.cost, qty: item.qty, role: item.role },
      })
    )
  )
  return { count: results.length }
}

export async function updatePortfolioItem(
  code: string,
  data: Partial<Pick<PortfolioItem, 'cost' | 'qty' | 'role' | 'name'>>
): Promise<void> {
  const client = requireDb()
  await client.portfolio.update({ where: { code }, data })
}

export async function deletePortfolioItem(code: string): Promise<void> {
  const client = requireDb()
  await client.portfolio.delete({ where: { code } })
}

export async function saveTradeLogic(code: string, logic: TradeLogic): Promise<void> {
  const client = requireDb()
  const exists = await client.portfolio.findUnique({ where: { code } })
  if (!exists) throw new Error(`持仓中不存在 ${code}，请先添加持仓`)
  await client.tradeLogic.upsert({
    where:  { code },
    create: { code, whyBuy: logic.whyBuy, sellCondition: logic.sellCondition, notSell: logic.notSell },
    update: { whyBuy: logic.whyBuy, sellCondition: logic.sellCondition, notSell: logic.notSell },
  })
}

export async function getTradeLogic(code: string): Promise<TradeLogic | null> {
  const client = requireDb()
  const row = await client.tradeLogic.findUnique({ where: { code } })
  if (!row) return null
  return {
    whyBuy:        row.whyBuy,
    sellCondition: row.sellCondition,
    notSell:       row.notSell,
    updatedAt:     row.updatedAt.toISOString(),
  }
}
