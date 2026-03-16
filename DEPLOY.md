# デプロイ手順 — Vercel + Supabase

## 前提
- Supabase プロジェクト作成済み（Step A で確認済み）
- `npm run db:push` 実行済み（テーブル作成済み）

---

## Step 1：GitHub にプッシュ

```bash
# プロジェクトフォルダで
cd C:\Stock\eight-dimensions-app

git init
git add .
git commit -m "initial: eight-dimensions-app v7"
```

GitHub で新しいリポジトリを作成（Private推奨）してからプッシュ：

```bash
git remote add origin https://github.com/[your-username]/eight-dimensions-app.git
git branch -M main
git push -u origin main
```

⚠️ `.gitignore` に `.env` と `.env.local` が含まれているので、APIキーは絶対にプッシュされません。

---

## Step 2：Vercel にデプロイ

1. https://vercel.com にログイン（GitHubアカウントで可）
2. **New Project** → GitHub リポジトリを選択
3. Framework Preset: **Next.js** が自動選択される
4. **Environment Variables** に以下を追加：

| 変数名 | 値 |
|--------|-----|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `DATABASE_URL` | Supabaseの接続URL（port 6543 版を使う） |

5. **Deploy** をクリック

---

## ⚠️ Supabase の DATABASE_URL について

本番（Vercel）では **port 6543**（Connection Pooler）を使うこと。

- 開発（ローカル）: `...supabase.co:5432/postgres`
- **本番（Vercel）: `...supabase.co:6543/postgres?pgbouncer=true`**

Supabase ダッシュボード → Settings → Database → **Connection pooling** の URI をコピー。

---

## Step 3：デプロイ後の確認

```
✅ https://[your-app].vercel.app が開く
✅ 単股分析が動く（Anthropic API）
✅ 自選股池の実時更新が動く（東方財富API）
✅ 分析履歴がDBに保存される（Supabase）
```

---

## 更新のたびに

```bash
git add .
git commit -m "fix: ..."
git push
```

GitHub にプッシュするだけで Vercel が自動ビルド・デプロイします。

---

## トラブルシューティング

### ビルドエラー：`Can't resolve '@prisma/client'`
→ `npm run postinstall`（= `prisma generate`）が実行されていない
→ Vercel の Build Command を `npm run build` から `npx prisma generate && npm run build` に変更

### 実行時エラー：`DATABASE_URL not found`
→ Vercel の Environment Variables に `DATABASE_URL` を追加したか確認
→ Production / Preview / Development すべてにチェックが入っているか確認

### DB接続エラー：`Connection timeout`
→ Supabase の DATABASE_URL が port **6543** になっているか確認
→ `?pgbouncer=true` が付いているか確認
