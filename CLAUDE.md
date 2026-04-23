# Gantt Pro - プロジェクト管理アプリ

ガントチャートベースのプロジェクト管理アプリ。タスクのフェーズ管理、スプレッドシート風編集、チームコラボレーション、更新依頼ワークフローを提供する。

## 開発ルール

**実装前に必ずPlan Modeで計画を立ててから実装すること。**

**実装完了後は必ず `code-reviewer` エージェントを起動してレビューを受け、承認を得てからタスク完了とすること。** レビューで🔴重大な問題が指摘された場合は修正してから再レビューを受けること。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router) + TypeScript 5
- **UI**: TailwindCSS 4, Lucide React, AG-Grid（シートビュー）
- **状態管理**: Zustand
- **ドラッグ&ドロップ**: @dnd-kit
- **バックエンド**: Supabase（PostgreSQL + Auth + Realtime）
- **メール通知**: Resend

## ディレクトリ構成

```
src/
  app/
    (auth)/          ログイン・登録ページ
    (dashboard)/     ダッシュボード・プロジェクトページ
    api/             APIルート（projects, tasks, phases, members, notifications, update-requests）
    auth/callback/   Supabase認証コールバック
  components/
    gantt/           ガントチャート本体・ドラッグフック
    sheet/           AG-Grid スプレッドシートビュー
    project/         プロジェクトビューコンテナ
    update-request/  承認ワークフローUI
    ui/              共通UIコンポーネント（Header, Sidebar, DatePicker）
    dashboard/       プロジェクト作成UI
  lib/
    supabase/        client / server / admin クライアント
    repositories/    データアクセス層（project, task）
    realtime/        RealtimeProvider（Supabase Postgres Changes）
    utils/           日付・クラス名ユーティリティ
  store/             Zustand ストア（project, task, notification, ui）
  types/
    database.ts      Supabase型定義
    index.ts         アプリ型定義
middleware.ts        認証ルートガード
```

## データベース設計

| テーブル | 用途 |
|---------|------|
| `profiles` | ユーザープロフィール |
| `projects` | プロジェクト（status: active/archived/completed） |
| `project_members` | メンバーシップ（role: owner/editor/viewer/limited_viewer） |
| `phases` | フェーズ（display_order付き） |
| `tasks` | タスク（スケジュール・進捗・ステータス・バージョン管理） |
| `update_requests` | 更新依頼ワークフロー（schedule/progress/status/general） |
| `notifications` | アプリ内通知 |
| `task_history` | タスク変更履歴（create/update/delete） |
| `share_scopes` | 細粒度の共有権限 |

## 主要APIルート

- `GET/POST/PATCH/DELETE /api/projects` - プロジェクトCRUD
- `GET/POST/PATCH/DELETE /api/tasks` - タスクCRUD（楽観的バージョン管理、409で競合検出）
- `POST /api/tasks/reorder` - タスク並び替え（display_order = index * 10）
- `GET/POST/PATCH/DELETE /api/phases` - フェーズCRUD
- `GET/POST/PATCH/DELETE /api/members` - メンバー管理（メール招待）
- `GET/PATCH /api/notifications` - 通知取得・既読化
- `GET/POST/PATCH /api/update-requests` - 更新依頼の作成・回答・承認/却下

## アーキテクチャパターン

**認証**: Supabase Auth + JWT、ミドルウェアによるルート保護

**状態管理**: Zustand グローバルストア + 楽観的更新 + Supabase Realtimeリアルタイム同期

**権限制御**: ロールベース（owner/editor/viewer/limited_viewer）+ APIエンドポイントでの認証チェック

**データ整合性**: タスクのバージョン管理（競合防止）、display_orderによるカスタムソート、task_historyによる監査ログ

## 環境変数（.env.local）

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 開発コマンド

```bash
npm run dev       # 開発サーバー起動（http://localhost:3000）
npm run build     # プロダクションビルド
npx tsc --noEmit  # 型チェック
```

## 直近の作業履歴

```
feat: ドラッグ並び替え・複数選択・カレンダー日付入力・Excel風編集
feat: Ganttビュー空行インライン入力 + シート二重作成バグ修正
fix:  シート編集バグ修正・Ganttに空行追加
feat: Excel風シートUI・設定画面フィールド拡張
feat: 設定画面・シート・サイドバーを完成
feat: 通知リアルタイム反映をHeader全体に移動
feat: 承認時にタスクを自動更新
feat: スプレッドシート風UI・Ganttカラム管理・更新依頼ワークフロー統合
```

## 未実装・今後の課題

- タスク依存関係のUI（DB項目は存在するが未表示）
- 親子タスク関係のUI（parent_task_idは存在）
- share_scopesを使った細粒度共有のUI
- Resendメール通知の本格活用
- task_historyを使った変更履歴表示UI
