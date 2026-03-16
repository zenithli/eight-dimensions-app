import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '八维度量化交易系统 V7',
  description: '两融账户 · 八维度 AI 评分 · 3+2+1战术框架',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
