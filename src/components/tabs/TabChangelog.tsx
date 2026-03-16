'use client'

const VERSIONS = [
  {
    ver: 'V7 · Next.js',
    date: '2026/03/17',
    label: '当前版本',
    labelType: 'hot',
    borderColor: 'var(--g)',
    sections: [
      {
        title: '✅ 新增 Added',
        color: 'var(--g)',
        items: [
          'Next.js 14 App Router + TypeScript · 45ファイル / 6,393行',
          'Supabase DB連携 · 6テーブル · 分析履歴永続保存',
          '震荡市フィルター AppHeaderバッジ（强势/震荡/弱势）',
          '90天走势図 — 価格/MA20乖離/RR比 canvasチャート',
          '自選股池 90日動能（近3ヶ月涨幅）列追加',
          '持仓対比ランキング（涨跌幅/盈亏额/成本価/持株数ソート）',
          '历史B分トレンドグラフ（銘柄クリック展開）',
          '止損仓位計算器（最大亏損額→最大持株数逆算）',
          '一括分析 batchAll（持仓・自選池 両方）',
          '個別更新ボタン ↻（自選股池1銘柄更新）',
          '強制再分析ボタン（キャッシュ無効化）',
          '信号追跡 SignalTrack（3ヶ月後の本物の胜率測定）',
          '止損帰因分析 StopLossEvent',
        ],
      },
      {
        title: '🔧 修复 Fixed',
        color: 'var(--y)',
        items: [
          '全タブの白天/夜间モード対応（#fff → var(--t)に統一）',
          '株名・コードの視認性改善（t3→c/t2 シアン統一）',
          'タブ切替で分析結果が消えないよう display:none 方式に変更',
          'Supabase接続 Session Pooler IPv4対応',
          'JSON解析エラー時のフォールバック処理',
        ],
      },
      {
        title: '📋 当前 Roadmap',
        color: 'var(--c)',
        items: [
          '✅ Step1〜4: 骨架・計算・設計・Tab実装',
          '✅ Step5: PostgreSQL DB化',
          '✅ Step6〜7: Vercel/Supabase本番デプロイ',
          '⏳ 3ヶ月稼働 → SignalTrack 300件で本物の胜率測定',
        ],
      },
    ],
  },
  {
    ver: 'V6 · HTML単文件',
    date: '2026/03/15',
    label: '前身版本',
    labelType: 'minor',
    borderColor: 'var(--c)',
    sections: [
      {
        title: '主要機能',
        color: 'var(--c)',
        items: [
          '八維度完整実装 · ⑧乖離铁律 · MA20真実計算',
          'CSV導入（千分位修正・BOM対応・GBK互換）',
          '90天走勢図 6層Canvas · 盈亏比R:R · 価格止損線',
          '3+2+1戦術方案 · 四大優化方案 · 月度轮換判定',
          '331KB単文件・維持困難 → V7に移行完了',
        ],
      },
    ],
  },
]

export function TabChangelog() {
  return (
    <div style={{ maxWidth: 860, display:'flex', flexDirection:'column', gap:16 }}>
      {VERSIONS.map((v) => (
        <div key={v.ver} style={{
          backgroundColor:'var(--bg2)', border:'1px solid var(--bd)',
          borderRadius:10, padding:'18px 22px', position:'relative', overflow:'hidden',
        }}>
          {/* 左ボーダーライン */}
          <div style={{
            position:'absolute', top:0, left:0, bottom:0, width:3,
            borderRadius:'3px 0 0 3px', backgroundColor: v.borderColor,
          }} />

          {/* ヘッダー */}
          <div style={{ display:'flex', alignItems:'center', gap:10,
            marginBottom:14, flexWrap:'wrap' as const }}>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:14, fontWeight:700,
              color:'var(--t)', letterSpacing:1 }}>
              {v.ver}
            </span>
            <span style={{ fontFamily:'IBM Plex Mono', fontSize:10, color:'var(--t2)' }}>
              {v.date}
            </span>
            <span style={{
              fontFamily:'IBM Plex Mono', fontSize:8, padding:'2px 8px',
              borderRadius:10, letterSpacing:0.5,
              ...(v.labelType === 'hot'
                ? { background:'rgba(255,140,42,.12)', borderColor:'rgba(255,140,42,.35)',
                    color:'var(--o)', border:'1px solid', fontWeight:700 }
                : { background:'rgba(0,207,255,.1)', borderColor:'rgba(0,207,255,.3)',
                    color:'var(--c)', border:'1px solid' }),
            }}>
              {v.label}
            </span>
          </div>

          {/* セクション */}
          {v.sections.map((sec) => (
            <div key={sec.title} style={{ marginBottom:10 }}>
              <div style={{ fontFamily:'IBM Plex Mono', fontSize:9, letterSpacing:2,
                color:'var(--t2)', marginBottom:5,
                display:'flex', alignItems:'center', gap:6 }}>
                {sec.title}
                <div style={{ flex:1, height:1, backgroundColor:'var(--bd)' }} />
              </div>
              <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                {sec.items.map((item, i) => (
                  <li key={i} style={{
                    fontSize:11, color:'var(--t2)', lineHeight:1.9,
                    padding:'3px 0 3px 16px', position:'relative',
                    borderBottom:'1px solid rgba(0,180,255,.03)',
                  }}>
                    <span style={{
                      position:'absolute', left:3, color:sec.color, fontWeight:700
                    }}>›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
