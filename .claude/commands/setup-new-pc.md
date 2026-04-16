# 新しいPCでの開発環境セットアップ

このスキルは別PCでこのプロジェクトを再開するための初期セットアップを行います。

## 手順

以下を順番に実行してください。

### 1. .env.local の確認

```bash
ls /Users/$(whoami)/Developer/gantt/.env.local 2>/dev/null && echo "✅ .env.local あり" || echo "❌ .env.local なし"
```

`.env.local` が存在しない場合は作業を止めて、以下をユーザーに伝えてください：

> `.env.local` ファイルが見つかりません。前回作業していたMacから以下のファイルをコピーしてください：
> 
> **コピー元（旧Mac）:**
> `/Users/yoshiharuikeda/Developer/gantt/.env.local`
> 
> **コピー先（このPC）:**
> `<プロジェクトフォルダ>/.env.local`
> 
> ファイルの中身には以下の3つの値が必要です：
> - `NEXT_PUBLIC_SUPABASE_URL`
> - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
> - `SUPABASE_SERVICE_ROLE_KEY`
> 
> コピーが完了したら「完了しました」と教えてください。

`.env.local` が確認できてから次のステップへ進んでください。

### 2. .env.local の内容検証

```bash
grep -c "SUPABASE_SERVICE_ROLE_KEY" .env.local
```

`1` が返れば OK。`0` の場合は `SUPABASE_SERVICE_ROLE_KEY` が不足しています（これがないとデータ保存が動きません）。

### 3. 依存パッケージのインストール

```bash
cd /Users/$(whoami)/Developer/gantt && npm install
```

エラーが出た場合は内容を確認して対処してください。

### 4. TypeScript の型チェック

```bash
cd /Users/$(whoami)/Developer/gantt && npx tsc --noEmit 2>&1 | head -20
```

エラーがなければ OK。

### 5. 開発サーバー起動確認

```bash
cd /Users/$(whoami)/Developer/gantt && npm run dev &
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

`200` が返れば起動成功。

### 6. 最新コードの確認

```bash
cd /Users/$(whoami)/Developer/gantt && git log --oneline -5
```

最新のコミットメッセージを表示して、前回の作業内容をユーザーに伝えてください。

### 7. セットアップ完了報告

すべて完了したら以下の形式で報告してください：

```
✅ セットアップ完了

【確認済み項目】
- .env.local: OK（SUPABASE_SERVICE_ROLE_KEY 含む）
- npm install: OK
- TypeScript: エラーなし
- 開発サーバー: http://localhost:3000 で起動中

【直近の作業内容】
（git logの最新コミットメッセージを要約）

【未完了タスク】
（以下を確認して報告）
- 承認時のタスク自動更新（approve → DB反映）
- 通知のリアルタイム更新
- プロジェクト設定画面の完成
```
