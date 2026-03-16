# 八维度量化交易系统 V7

Next.js + TypeScript + Tailwind CSS + shadcn/ui への移行版  
**前身: eight-dimensions-v6.html（331KB・6393行のHTML単一ファイル）**

---

## 技術スタック

| レイヤー | 採用技術 |
|----------|----------|
| フロント | Next.js 14 (App Router) + TypeScript |
| スタイル | Tailwind CSS + shadcn/ui |
| 計算ロジック | `src/lib/core/` — 純粋関数、DOM不依存 |
| バックエンド | Next.js Route Handlers |
| 外部API | 東方財富API（行情・K線）+ Anthropic Claude API |
| DB（第5步以降） | PostgreSQL（Supabase or Neon）+ Prisma |

---

## セットアップ

### 1. リポジトリをクローン後、依存パッケージをインストール

```bash
cd eight-dimensions-app
npm install
```

### 2. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```env
# Anthropic API Key（必須）
ANTHROPIC_API_KEY="sk-ant-..."

# PostgreSQL（ステップ5以降・今は不要）
# DATABASE_URL="postgresql://..."
```

> **Anthropic API Key の取得方法**  
> https://console.anthropic.com → API Keys → Create Key

### 3. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します。  
画面上部の API Key 欄に Anthropic API Key を入力・保存してください。

---

## プロジェクト構造

```
src/
├── lib/
│   ├── core/               ← 核心計算ライブラリ（ステップ2）
│   │   ├── b-score.ts      B分計算（①〜⑧次元）
│   │   ├── ma.ts           移動平均・MA20乖離・BIAS200
│   │   ├── position.ts     仓位・止損・盈亏比
│   │   ├── pool-sort.ts    自選池ソート・月度轮换判定
│   │   ├── format.ts       表示フォーマット（涨跌%・出来高）
│   │   ├── csv-parser.ts   CSV解析（华泰証券フォーマット）
│   │   ├── time.ts         北京時間ユーティリティ
│   │   └── index.ts
│   ├── eastmoney.ts        東方財富APIクライアント（サーバー専用）
│   └── utils.ts            cn()
│
├── types/
│   ├── domain.ts           ドメイン型（PortfolioItem・WatchlistStock等）
│   ├── api.ts              APIリクエスト/レスポンス型
│   └── index.ts
│
├── app/
│   ├── page.tsx            ルートページ
│   ├── layout.tsx
│   ├── globals.css         デザイントークン（八维度配色）
│   └── api/
│       ├── analyze/        AI八维度分析
│       ├── quote/          リアルタイム行情
│       ├── ma20/           MA20乖離バッチ計算
│       └── portfolio/
│           └── import/     CSV导入diff計算
│
└── components/
    ├── layout/
    │   ├── MainLayout.tsx  メインレイアウト
    │   ├── AppHeader.tsx   ヘッダー（APIキー・テーマ・時刻）
    │   └── TabNav.tsx      8タブナビゲーション
    ├── tabs/
    │   ├── TabAnalyze.tsx  単株分析
    │   ├── TabPortfolio.tsx 持仓（CSV导入）
    │   ├── TabPool.tsx     自選池（B分・MA20乖離）
    │   ├── TabCompare.tsx  多股対比（外殻）
    │   ├── TabAlerts.tsx   価格アラート（外殻）
    │   ├── TabTactic.tsx   3+2+1戦術（外殻）
    │   ├── TabHistory.tsx  履歴（外殻）
    │   └── TabChangelog.tsx 更新日志
    └── shared/
        └── Card.tsx        共通カード
```

---

## 移行ロードマップ

| ステップ | 内容 | 状態 |
|----------|------|------|
| ステップ1 | Next.js骨格 + Layout + Tab外殻 | ✅ 完了 |
| ステップ2 | 核心計算ライブラリ抽離 (`lib/core`) | ✅ 完了 |
| ステップ3 | 型定義・データ契約 (`types/`) | ✅ 完了 |
| ステップ4 | 自選株池Tab の完全クローズドループ | 🚧 実装中 |
| ステップ5 | PostgreSQL スキーマ確定 + Prisma導入 | ⏳ 未着手 |
| ステップ6 | API Routes 完成 | ⏳ 未着手 |
| ステップ7 | 残りTab移行（分析・対比・アラート・戦術） | ⏳ 未着手 |
| ステップ8 | ZIP出力 | ⏳ 未着手 |

---

## V6からの移行ノート

### `lib/core/` に移植した関数

| V6 HTML関数 | 移行先 |
|-------------|--------|
| `calcBFromData()` | `lib/core/b-score.ts` → `calcBScore()` |
| `calcBias200()` | `lib/core/ma.ts` → `calcBias200()` |
| `calcPosition()` | `lib/core/position.ts` |
| `csvParseRaw()` | `lib/core/csv-parser.ts` → `parsePortfolioCsv()` |
| `cstNow()` / `isTradeOpen()` | `lib/core/time.ts` |
| `pctFmt()` / `fmtVol()` | `lib/core/format.ts` |

### APIキー管理の改善

V6では `localStorage` → ブラウザから Claude API を直接呼び出していました。  
V7では **Next.js Route Handler 経由**に変更。APIキーはサーバー環境変数に格納できます。

### localStorage → 今後の判断

現時点では持仓・自選池データを localStorage に保存しています。  
ステップ5で「どのデータをDBに移すか」を実際の使用状況から判断します。

---

## よくある質問

**Q: 東方財富APIのCORSエラーが出る**  
A: `src/lib/eastmoney.ts` はサーバー専用です。フロントから直接呼ばず、Route Handler 経由で使用してください。

**Q: Claude APIのレートエラーが出る**  
A: Anthropic のダッシュボードでレート制限を確認してください。

**Q: 既存のV6 HTMLのlocalStorageデータを引き継ぎたい**  
A: 開発ツール → Application → Local Storage から `qtportfolio` / `qt_pool_v5` の値をコピーして、V7の初期データとして使えます。

---

## Step 5：PostgreSQL 設定（任意）

設定しなくても localStorage で動作しますが、設定すると以下が有効になります：
- 分析履歴の永続保存（換設備後も残る）
- 持仓理由档案のDB保存
- 価格予警のDB管理

### 無料DBの作り方（Supabase 推奨）

1. https://supabase.com でアカウント作成
2. 「New project」でプロジェクト作成
3. Settings > Database > Connection string > URI をコピー
4. `.env.local` に追記：
   ```
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres"
   ```
5. テーブル作成：
   ```bash
   npx prisma generate
   npx prisma db push
   ```
6. 確認：
   ```bash
   npx prisma studio   # ブラウザでDB内容を確認
   ```

### テーブル構成（4テーブル）

| テーブル | 内容 |
|---------|------|
| `portfolio` | 持仓（コード/名称/成本/数量/役割） |
| `trade_logic` | 持仓理由档案（买入理由/売出条件/不売理由） |
| `analysis_history` | AI分析記録（B分/シグナル/止損/要約） |
| `price_alert` | 価格予警（目標価格/方向/触発状況） |
