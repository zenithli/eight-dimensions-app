# 部署前验收清单

> 在 Vercel 部署前，请按顺序逐项确认。
> 每项后面标注了执行方式：**命令** / **手动确认** / **自动**。

---

## ① Supabase 真实读写验证

> 目标：4张表都能写入、读取、删除，无报错。

### 执行方式

```powershell
cd C:\Stock\eight-dimensions-app
npm run db:test
```

### 预期结果

```
🎉 全テスト通過 10/10
DB接続・読み書き完全確認 ✅
```

### 验收项目

| # | 检查项 | 命令/方式 | 预期结果 |
|---|--------|-----------|---------|
| 1-1 | DB连接成功 | `npm run db:test` | `[1/6] 接続成功` |
| 1-2 | Portfolio 写入读取 | 同上 | `[2/6] 書き込み/読み込み成功` |
| 1-3 | TradeLogic JOIN读取 | 同上 | `[3/6] JOIN読み込み成功` |
| 1-4 | AnalysisHistory 写入读取 | 同上 | `[4/6] 書き込み/読み込み成功` |
| 1-5 | PriceAlert 写入读取 | 同上 | `[5/6] 書き込み/読み込み成功` |
| 1-6 | 测试数据自动清理 | 同上 | `[6/6] クリーンアップ完了` |

---

## ② localStorage Fallback 验证

> 目标：断开 DATABASE_URL 后，3个 Tab 都能用 localStorage 正常运行。

### 执行方式

将 `.env.local` 中的 `DATABASE_URL` 临时注释掉：

```
# DATABASE_URL="postgresql://..."   ← 这行加 # 注释
```

然后重启开发服务器：

```powershell
npm run dev
```

### 验收项目

| # | 检查项 | 操作方式 | 预期结果 |
|---|--------|----------|---------|
| 2-1 | 持仓 Tab 正常加载 | 打开「我的持仓」 | 显示持仓卡片，右上角显示 `○ localStorage` |
| 2-2 | 历史记录 Tab 正常加载 | 打开「历史记录」 | 显示记录（无报错），右上角显示 `○ localStorage` |
| 2-3 | 价格预警 Tab 正常加载 | 打开「价格预警」 | 正常显示，右上角显示 `○ localStorage` |
| 2-4 | 单股分析正常运行 | 分析一只股票 | AI分析结果正常显示（不依赖DB） |
| 2-5 | 自选股池正常运行 | 切换到「自选股池」 | B分表格正常显示 |
| 2-6 | 无报错弹出 | 观察浏览器控制台 | 无红色 Error（黄色 Warning 可忽略） |

验证完成后，**恢复 DATABASE_URL 注释**，重启服务器。

---

## ③ npm run build 验证

> 目标：本地 build 通过，无 TypeScript 错误，无 Next.js 构建错误。

### 执行方式

```powershell
cd C:\Stock\eight-dimensions-app
npm run build
```

### 预期结果

```
✓ Compiled successfully
✓ Linting and checking validity of types
Route (app)                              Size     First Load JS
┌ ○ /                                    ...
...
✓ Generating static pages
```

### 验收项目

| # | 检查项 | 预期结果 |
|---|--------|---------|
| 3-1 | TypeScript 型チェック通過 | `Linting and checking validity of types` ✓ |
| 3-2 | 全ページビルド成功 | `Compiled successfully` |
| 3-3 | API Routes ビルド成功 | `/api/analyze` `/api/quote` `/api/ma20` が Route 一覧に表示 |
| 3-4 | ビルド時間 120秒以内 | 通常 30〜60秒 |
| 3-5 | エラーメッセージなし | `Error:` で始まる行がない |

### もし失敗した場合

よくある原因と対処：

```
Error: Can't resolve '@prisma/client'
→ npx prisma generate を実行してから再試行

Error: Type 'null' is not assignable...
→ src/lib/db.ts の型定義を確認

Error: 'use server' cannot be used in a Client Component
→ Server Action ファイルの先頭に 'use server' があるか確認
```

---

## ④ Vercel に設定必須の環境変数

> 目标：Vercel のダッシュボードに以下を設定してからデプロイする。

### 設定場所

Vercel ダッシュボード → Project → Settings → **Environment Variables**

### 必須変数

| 変数名 | 値 | 必須 | 備考 |
|--------|-----|------|------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | **必須** | AI分析に使用。なければ分析機能が動かない |
| `DATABASE_URL` | `postgresql://postgres:...@...supabase.co:**6543**/postgres?pgbouncer=true` | **推奨** | なくてもlocalStorageで動く |

### ⚠️ DATABASE_URL は port に注意

```
❌ 開発用（ローカルのみ）:
   postgresql://postgres:...@db.xxx.supabase.co:5432/postgres

✅ 本番用（Vercel 必須）:
   postgresql://postgres:...@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

**取得方法**：
Supabase ダッシュボード → Settings → Database →
**「Connection pooling」セクション** → Connection string → URI をコピー

### 設定スコープ

| スコープ | 設定要否 |
|---------|---------|
| Production | ✅ 必須 |
| Preview | ✅ 推奨（PRのプレビューでも動くように） |
| Development | ✅ 推奨 |

→ 3つ全てにチェックを入れる

### 設定してはいけないもの

| 変数名 | 理由 |
|--------|------|
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | `NEXT_PUBLIC_` プレフィックスはブラウザに露出する |
| `NEXT_PUBLIC_DATABASE_URL` | 同上、DB接続情報が漏洩する |

---

## ⑤ デプロイ後の動作確認（参考）

> デプロイ成功後に確認する項目。

| # | 確認項目 | 確認方法 |
|---|---------|---------|
| 5-1 | ページが開く | `https://[app].vercel.app` にアクセス |
| 5-2 | API Key 保存が動く | ヘッダーに API Key を入力して保存 |
| 5-3 | 単株分析が動く | 銘柄コードを入力して分析 |
| 5-4 | DB接続表示が `● Supabase DB` になる | 持仓/履歴/予警の右上バッジ確認 |
| 5-5 | 分析履歴が保存される | 分析後に履歴 Tab を確認 |
| 5-6 | 自選股池の実時更新が動く | 「↻ 実時更新」ボタンをクリック |

---

## まとめ：クリティカルパス

```
① npm run db:test → 10/10 ✅
        ↓
② DATABASE_URL を一時コメントアウトして fallback 確認 ✅
        ↓
③ npm run build → エラーなし ✅
        ↓
④ Vercel に環境変数設定（ANTHROPIC_API_KEY + DATABASE_URL port 6543）
        ↓
    デプロイ 🚀
```

---

*生成日: 2026/03/16  八维度量化交易系统 V7*
