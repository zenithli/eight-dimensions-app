'use server'

// src/app/actions/alerts.ts
import { db } from '@/lib/db'
import type { PriceAlert } from '@/types/domain'

function requireDb() {
  if (!db) throw new Error('DATABASE_URL が設定されていません')
  return db
}

export async function getAlerts(): Promise<PriceAlert[]> {
  const client = requireDb()
  const rows = await client.priceAlert.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(r => ({
    id:        r.id,
    code:      r.code,
    name:      r.name,
    alertType: r.alertType as 'above' | 'below',
    price:     r.targetPrice,
    triggered: r.triggered,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function addAlert(
  alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>
): Promise<PriceAlert> {
  const client = requireDb()
  const row = await client.priceAlert.create({
    data: {
      code:        alert.code,
      name:        alert.name,
      alertType:   alert.alertType,
      targetPrice: alert.price,
      triggered:   false,
    },
  })
  return {
    id:        row.id,
    code:      row.code,
    name:      row.name,
    alertType: row.alertType as 'above' | 'below',
    price:     row.targetPrice,
    triggered: row.triggered,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function deleteAlert(id: number): Promise<void> {
  const client = requireDb()
  await client.priceAlert.delete({ where: { id } })
}

export async function checkAlerts(
  quotes: Array<{ code: string; price: number }>
): Promise<Array<{ id: number; code: string; name: string; alertType: string; targetPrice: number }>> {
  const client = requireDb()
  const priceMap = new Map(quotes.map(q => [q.code, q.price]))
  const pending  = await client.priceAlert.findMany({ where: { triggered: false } })
  const triggered = pending.filter(a => {
    const cur = priceMap.get(a.code)
    if (cur === undefined) return false
    return (a.alertType === 'above' && cur >= a.targetPrice) ||
           (a.alertType === 'below' && cur <= a.targetPrice)
  })
  if (triggered.length > 0) {
    await client.priceAlert.updateMany({
      where: { id: { in: triggered.map(a => a.id) } },
      data:  { triggered: true, triggeredAt: new Date() },
    })
  }
  return triggered.map(a => ({
    id: a.id, code: a.code, name: a.name,
    alertType: a.alertType, targetPrice: a.targetPrice,
  }))
}
