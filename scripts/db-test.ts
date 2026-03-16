/**
 * scripts/db-test.ts
 *
 * DB接続テスト — 完全クローズドループ確認
 * 実行: npx ts-node --skip-project scripts/db-test.ts
 *  または: npx tsx scripts/db-test.ts
 *
 * テスト内容:
 *   1. DB接続確認
 *   2. Portfolio テーブルへの書き込み
 *   3. 書き込んだデータの読み込み
 *   4. TradeLogic（関連テーブル）の書き込み・読み込み
 *   5. AnalysisHistory への書き込み・読み込み
 *   6. PriceAlert への書き込み・読み込み
 *   7. テストデータの削除（クリーンアップ）
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({
  log: ['error'],
})

const TEST_CODE = '000000'  // テスト専用ダミーコード

async function main() {
  const results: Array<{ name: string; ok: boolean; detail?: string }> = []
  const t = (name: string, ok: boolean, detail?: string) =>
    results.push({ name, ok, detail })

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║  八维度V7 DB 接続・読み書きテスト        ║')
  console.log('╚══════════════════════════════════════════╝\n')

  // ── 1. 接続確認 ──
  console.log('[ 1/6 ] DB接続確認...')
  try {
    await db.$connect()
    await db.$queryRaw`SELECT 1`
    t('DB接続', true, 'PostgreSQL 接続OK')
    console.log('  ✅ 接続成功\n')
  } catch (e) {
    t('DB接続', false, String(e))
    console.log(`  ❌ 接続失敗: ${e}\n`)
    console.log('  → DATABASE_URL が正しく設定されているか確認してください')
    await db.$disconnect()
    printResults(results)
    process.exit(1)
  }

  // ── クリーンアップ（前回のテストデータが残っていれば削除）──
  await db.tradeLogic.deleteMany({ where: { code: TEST_CODE } })
  await db.portfolio.deleteMany({ where: { code: TEST_CODE } })
  await db.analysisHistory.deleteMany({ where: { code: TEST_CODE } })
  await db.priceAlert.deleteMany({ where: { code: TEST_CODE } })

  // ── 2. Portfolio 書き込み ──
  console.log('[ 2/6 ] Portfolio 書き込みテスト...')
  try {
    const created = await db.portfolio.create({
      data: {
        code: TEST_CODE,
        name: 'テスト銘柄',
        cost: 18.50,
        qty:  1000,
        role: 'テスト',
      },
    })
    t('Portfolio 書き込み', !!created.id, `id=${created.id}`)

    // 読み込み確認
    const found = await db.portfolio.findUnique({ where: { code: TEST_CODE } })
    t('Portfolio 読み込み',
      found?.name === 'テスト銘柄' && found?.cost === 18.50,
      `name=${found?.name} cost=${found?.cost}`)
    console.log(`  ✅ 書き込み/読み込み成功 (id=${created.id})\n`)
  } catch (e) {
    t('Portfolio 書き込み', false, String(e))
    t('Portfolio 読み込み', false, 'スキップ')
    console.log(`  ❌ 失敗: ${e}\n`)
  }

  // ── 3. TradeLogic（関連テーブル）書き込み ──
  console.log('[ 3/6 ] TradeLogic 書き込みテスト...')
  try {
    const logic = await db.tradeLogic.create({
      data: {
        code:          TEST_CODE,
        whyBuy:        'テスト：エネルギー転換テーマ、MA20乖離8%以下',
        sellCondition: 'B分<3.5 または MA20乖離>35%',
        notSell:       '短期の下落では売らない',
      },
    })
    t('TradeLogic 書き込み', !!logic.id, `id=${logic.id}`)

    // Portfolio と JOIN して読み込み
    const withLogic = await db.portfolio.findUnique({
      where:   { code: TEST_CODE },
      include: { logic: true },
    })
    t('TradeLogic JOIN読み込み',
      withLogic?.logic?.whyBuy?.includes('エネルギー転換テーマ') ?? false,
      `whyBuy確認OK`)
    console.log('  ✅ TradeLogic 書き込み/JOIN読み込み成功\n')
  } catch (e) {
    t('TradeLogic 書き込み', false, String(e))
    t('TradeLogic JOIN読み込み', false, 'スキップ')
    console.log(`  ❌ 失敗: ${e}\n`)
  }

  // ── 4. AnalysisHistory 書き込み ──
  console.log('[ 4/6 ] AnalysisHistory 書き込みテスト...')
  try {
    const hist = await db.analysisHistory.create({
      data: {
        code:       TEST_CODE,
        name:       'テスト銘柄',
        price:      18.84,
        changePct:  2.35,
        totalScore: 4.25,
        signal:     '买入',
        stopLoss:   17.33,
        targetPrice: 21.67,
        riskRatio:  '1:2.1',
        summary:    'テスト：趋势共振 + 量能加速，⑧乖离8%以下',
        scoresJson: JSON.stringify([
          { dim:1, name:'趋势共振', score:4.5, analysis:'5轴全阳' },
          { dim:2, name:'量能加速', score:4.0, analysis:'量比1.8放量上涨' },
        ]),
      },
    })
    t('AnalysisHistory 書き込み', !!hist.id, `id=${hist.id} score=${hist.totalScore}`)

    // 読み込み確認
    const history = await db.analysisHistory.findMany({
      where:   { code: TEST_CODE },
      orderBy: { createdAt: 'desc' },
      take:    1,
    })
    const scores = JSON.parse(history[0]?.scoresJson ?? '[]')
    t('AnalysisHistory 読み込み',
      history.length === 1 && scores.length === 2,
      `件数=${history.length} scores=${scores.length}`)
    console.log('  ✅ AnalysisHistory 書き込み/読み込み成功\n')
  } catch (e) {
    t('AnalysisHistory 書き込み', false, String(e))
    t('AnalysisHistory 読み込み', false, 'スキップ')
    console.log(`  ❌ 失敗: ${e}\n`)
  }

  // ── 5. PriceAlert 書き込み ──
  console.log('[ 5/6 ] PriceAlert 書き込みテスト...')
  try {
    const alert = await db.priceAlert.create({
      data: {
        code:        TEST_CODE,
        name:        'テスト銘柄',
        alertType:   'below',
        targetPrice: 16.50,
        triggered:   false,
        note:        '止损线',
      },
    })
    t('PriceAlert 書き込み', !!alert.id, `id=${alert.id}`)

    // 未触発のアラートを取得
    const pending = await db.priceAlert.findMany({
      where: { triggered: false, code: TEST_CODE },
    })
    t('PriceAlert 読み込み', pending.length === 1, `未触発件数=${pending.length}`)
    console.log('  ✅ PriceAlert 書き込み/読み込み成功\n')
  } catch (e) {
    t('PriceAlert 書き込み', false, String(e))
    t('PriceAlert 読み込み', false, 'スキップ')
    console.log(`  ❌ 失敗: ${e}\n`)
  }

  // ── 6. クリーンアップ ──
  console.log('[ 6/6 ] テストデータ削除...')
  try {
    await db.tradeLogic.deleteMany({ where: { code: TEST_CODE } })
    await db.priceAlert.deleteMany({ where: { code: TEST_CODE } })
    await db.analysisHistory.deleteMany({ where: { code: TEST_CODE } })
    await db.portfolio.deleteMany({ where: { code: TEST_CODE } })
    t('テストデータ削除', true)
    console.log('  ✅ クリーンアップ完了\n')
  } catch (e) {
    t('テストデータ削除', false, String(e))
    console.log(`  ❌ 削除失敗: ${e}\n`)
  }

  await db.$disconnect()
  printResults(results)
}

function printResults(results: Array<{ name: string; ok: boolean; detail?: string }>) {
  const passed = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok)

  console.log('═'.repeat(46))
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌'
    console.log(`  ${icon} ${r.name}${r.detail ? `  [${r.detail}]` : ''}`)
  }
  console.log('═'.repeat(46))
  if (failed.length === 0) {
    console.log(`\n🎉 全テスト通過 ${passed}/${results.length}`)
    console.log('   DB接続・読み書き完全確認 ✅')
    console.log('   次のステップ: 历史記録 Tab の実装\n')
  } else {
    console.log(`\n⚠️  ${failed.length}件 失敗`)
    console.log('   失敗項目:')
    for (const f of failed) {
      console.log(`   ❌ ${f.name}: ${f.detail}`)
    }
    console.log('\n   確認事項:')
    console.log('   1. .env.local の DATABASE_URL が正しいか')
    console.log('   2. npx prisma db push を実行したか')
    console.log('   3. Supabase のプロジェクトが起動しているか\n')
  }
}

main().catch(e => {
  console.error('予期しないエラー:', e)
  process.exit(1)
})
