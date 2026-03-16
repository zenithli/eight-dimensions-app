// src/lib/db.ts
// Prisma Client シングルトン
// DATABASE_URL 未設定時は null を返す（ビルドエラー防止）

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db: PrismaClient | null =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production' && db) {
  globalForPrisma.prisma = db
}

// DB が有効かチェックするヘルパー
export function isDbEnabled(): boolean {
  return db !== null && !!process.env.DATABASE_URL
}
