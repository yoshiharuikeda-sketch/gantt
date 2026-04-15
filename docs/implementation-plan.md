# Ganttチャートベース工程管理アプリ 実装計画

## Context

複数プロジェクトの工程管理をGanttチャートで行うWebアプリを新規開発する。
既存コードベースはなく、完全にゼロから構築する。
クラウドのみ（Vercel + Supabase）で展開し、最大300ユーザー・50同時接続に対応する。

主な課題:
- リアルタイム共同編集（50同時接続）
- タスク単位・フェーズ単位での部分共有
- 更新リクエストの**承認ワークフロー**（担当者更新 → 上位管理者/管理者承認 → Gantt反映）
- 初心者も使えるエクセル風シートUI

---

## 技術スタック

| 層 | 技術 | 理由 |
|---|---|---|
| フロントエンド | Next.js 14 (App Router) + TypeScript | SSR/SPAの両立、API Routes、Vercel最適化 |
| スタイル | Tailwind CSS | グリッドUIのカスタマイズ柔軟性 |
| 状態管理 | Zustand + TanStack Query v5 | リアルタイム状態と非同期状態の分離 |
| Ganttレンダリング | カスタムSVG実装 + @dnd-kit + date-fns | 部分共有・リアルタイム要件に既存ライブラリが不適合 |
| シートUI | AG Grid Community (無料・MIT) | インライン編集・コピペ・大量行対応 |
| DB + Auth + Realtime | Supabase (PostgreSQL + RLS + Realtime) | 認証・RLS・WebSocket・DB統合 |
| メール通知 | Resend | シンプルAPI、Next.js親和性 |
| ホスティング | Vercel (フロント) + Supabase Cloud (DB) | フルマネージド、CI/CD込み |

---

## データモデル

```sql
-- プロファイル (Supabase Auth連携)
profiles(id, email, display_name, avatar_url, created_at)

-- プロジェクト
projects(id, name, description, owner_id, status[active/archived/completed],
         start_date, end_date, color, created_at, updated_at)

-- プロジェクトメンバー
project_members(id, project_id, user_id, role[owner/editor/viewer/limited_viewer],
                invited_by, joined_at)

-- フェーズ（タスクグループ）
phases(id, project_id, name, display_order, color, start_date, end_date)

-- タスク
tasks(id, project_id, parent_task_id, phase_id, name, description,
      assignee_id, start_date, end_date, progress[0-100],
      status[not_started/in_progress/completed/blocked],
      display_order, dependencies JSONB, version INTEGER,
      updated_by UUID, created_at, updated_at)

-- 部分共有スコープ
share_scopes(id, project_id, shared_with_user_id,
             share_type[task/phase/full], scope_ids UUID[],
             can_edit BOOLEAN, expires_at, created_by, created_at)

-- 更新リクエスト (承認ワークフロー)
update_requests(
  id, task_id, project_id,
  requester_id,          -- 依頼した人（上位管理者）
  assignee_id,           -- タスク担当者
  approver_id,           -- 承認者（requester or owner）
  request_type[schedule/progress/status/general],
  message TEXT,
  status[pending/submitted/approved/rejected],
  response_data JSONB,   -- {progress, start_date, end_date, status, comment}
  responded_at, approved_at, rejection_reason TEXT, due_date, created_at
)

-- 通知
notifications(id, user_id, type, title, body, data JSONB, is_read, created_at)

-- タスク操作履歴
task_history(id, task_id, user_id, operation, changes JSONB, server_timestamp)
```

### RLS（Row Level Security）ポリシー方針

```sql
-- tasks の SELECT ポリシー
-- 通常メンバー(owner/editor/viewer): project_membersで判定
-- 部分共有ユーザー(limited_viewer): share_scopesのscope_idsと照合
--   share_type='task'  → tasks.id = ANY(scope_ids)
--   share_type='phase' → tasks.phase_id = ANY(scope_ids)
--   share_type='full'  → 全タスク
```

---

## 更新リクエストの承認ワークフロー

```
[上位管理者 or プロジェクト管理者]
    │ タスク行の「更新依頼」ボタン押下
    │ (依頼種別: schedule/progress/status/general + メッセージ)
    ▼
update_requests INSERT (status='pending')
    │
    ├─→ notifications INSERT (担当者向け)
    └─→ メール送信 (Resend)

[タスク担当者]
    │ 通知クリック → 更新フォーム表示
    │ (progress%, 開始日, 終了日, ステータス, コメント入力)
    ▼
update_requests UPDATE (response_data設定, status='submitted')
    │
    ├─→ notifications INSERT (承認者向け: requester_id or owner)
    └─→ メール送信 (承認者へ)

[承認者（依頼した上位管理者 or オーナー）]
    │ 変更内容を確認（差分プレビュー付き）
    │
    ├─[承認] update_requests UPDATE (status='approved', approved_at)
    │            │
    │            └─→ PostgreSQL Trigger: tasks テーブルに変更を反映
    │                 notifications INSERT (担当者へ「承認されました」)
    │
    └─[却下] update_requests UPDATE (status='rejected', rejection_reason)
                 └─→ notifications INSERT (担当者へ「却下されました」)
```

**承認者の決定ロジック**:
- `approver_id = requester_id`（依頼した人が承認）
- ただし `requester_id` がオーナー以外の場合、オーナーも承認可能

**PostgreSQL Trigger（承認時の自動タスク更新）**:

```sql
CREATE FUNCTION apply_approved_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'submitted' THEN
    UPDATE tasks SET
      progress    = COALESCE((NEW.response_data->>'progress')::int, progress),
      start_date  = COALESCE((NEW.response_data->>'start_date')::date, start_date),
      end_date    = COALESCE((NEW.response_data->>'end_date')::date, end_date),
      status      = COALESCE(NEW.response_data->>'status', status),
      updated_at  = NOW()
    WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## システムアーキテクチャ

```
[Vercel - Next.js App]
  ├── App Router Pages
  │     ├── /login, /register
  │     ├── / (dashboard: project list)
  │     └── /projects/[id] (gantt/sheet view + settings + shares)
  │
  ├── API Route Handlers (/api/*)
  │     ├── projects, tasks, phases
  │     ├── members, shares
  │     ├── update-requests (submit / approve / reject)
  │     └── notifications
  │
  └── RealtimeProvider (Supabase WebSocket)
        ├── postgres_changes on tasks → Zustand taskStore 更新
        ├── postgres_changes on update_requests → 承認UI更新
        └── presence → オンラインユーザー表示

[Supabase Cloud]
  ├── PostgreSQL + RLS Policies
  ├── Realtime Engine (LISTEN/NOTIFY)
  ├── Auth (Email + Google OAuth)
  └── Triggers (承認時タスク自動更新)
```

### リアルタイム同期戦略

- **楽観的更新**: UIを即時反映 → Supabase PATCH → 失敗時ロールバック
- **競合解決**: Last Write Wins + バージョン番号（`.eq('version', currentVersion)`）
- **自分の更新は無視**: `updated_by` フィールドで判定しエコーを除去

---

## ディレクトリ構成

```
/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── (dashboard)/page.tsx                    # プロジェクト一覧
│   │   ├── (dashboard)/projects/[id]/page.tsx      # Gantt/Sheet
│   │   ├── (dashboard)/projects/[id]/shares/page.tsx
│   │   ├── (dashboard)/projects/[id]/settings/page.tsx
│   │   └── api/
│   │       ├── projects/route.ts
│   │       ├── tasks/route.ts
│   │       ├── phases/route.ts
│   │       ├── members/route.ts
│   │       ├── shares/route.ts
│   │       ├── update-requests/route.ts
│   │       └── notifications/route.ts
│   │
│   ├── components/
│   │   ├── gantt/
│   │   │   ├── GanttChart.tsx          # メイン（SVGベース）
│   │   │   ├── GanttHeader.tsx         # タイムスケール（日/週/月）
│   │   │   ├── GanttRow.tsx            # 1タスク行
│   │   │   ├── TaskBar.tsx             # SVG rect + ドラッグ
│   │   │   ├── ProgressOverlay.tsx     # 進捗オーバーレイ
│   │   │   ├── DependencyArrow.tsx     # SVG path 依存関係矢印
│   │   │   └── hooks/useGanttDrag.ts
│   │   │
│   │   ├── sheet/
│   │   │   ├── TaskSheet.tsx           # AG Grid wrapper
│   │   │   ├── columns/                # カスタム列定義
│   │   │   └── editors/                # カスタムセルエディタ
│   │   │
│   │   ├── update-request/
│   │   │   ├── RequestButton.tsx       # 「更新依頼」ボタン
│   │   │   ├── RequestModal.tsx        # 依頼フォーム
│   │   │   ├── ResponseForm.tsx        # 担当者の回答フォーム
│   │   │   └── ApprovalPanel.tsx       # 承認者の差分確認・承認/却下UI
│   │   │
│   │   ├── sharing/
│   │   │   ├── ShareModal.tsx          # 共有設定モーダル
│   │   │   └── ScopePicker.tsx         # タスク/フェーズ選択
│   │   │
│   │   └── ui/                         # 汎用コンポーネント
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── NotificationBell.tsx
│   │       └── PresenceAvatars.tsx
│   │
│   ├── store/
│   │   ├── taskStore.ts
│   │   ├── projectStore.ts
│   │   ├── uiStore.ts
│   │   └── notificationStore.ts
│   │
│   └── lib/
│       ├── supabase/client.ts
│       ├── supabase/server.ts
│       ├── repositories/
│       │   ├── taskRepository.ts
│       │   ├── projectRepository.ts
│       │   └── shareRepository.ts
│       ├── realtime/
│       │   ├── RealtimeProvider.tsx
│       │   └── useRealtimeSync.ts
│       └── utils/
│           ├── dateUtils.ts
│           ├── ganttUtils.ts
│           └── cn.ts
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_triggers_and_functions.sql
│
└── docs/
    └── implementation-plan.md   # このファイル
```

---

## 実装フェーズ

### Phase 0: 基盤構築（1週間）✅ 完了
- [x] Supabase マイグレーションファイル作成（001〜003）
- [x] Next.js + TypeScript + Tailwind 初期化
- [x] Supabase Auth 設定（メール + Google OAuth）
- [x] 認証ミドルウェア + ログイン/登録ページ
- [x] 基本レイアウト（サイドバー・ヘッダー）
- [x] Zustand ストア・TypeScript 型定義
- [ ] 不足パッケージのインストール（zustand, lucide-react, date-fns 等）
- [ ] `npm run build` でビルド確認

### Phase 1: MVP - 単一ユーザーのGantt（2週間）🔄 進行中
- [x] GanttChart.tsx 骨格実装（バー表示・ズーム切り替え・スクロール同期）
- [ ] プロジェクトCRUD（API Routes）
- [ ] フェーズ + タスクCRUD（API Routes + Repositoryパターン）
- [ ] Ganttドラッグ操作（@dnd-kit、日付変更）
- [ ] AG Grid シートビュー（インライン編集・カスタム列）
- [ ] シート↔Ganttビュー切り替え（完全動作）

### Phase 2: コラボレーション基盤（2週間）
- [ ] プロジェクトメンバー招待（メールリンク）
- [ ] RLS ポリシー適用・動作確認
- [ ] RealtimeProvider（タスク変更のリアルタイム同期）
- [ ] プレゼンス表示（誰がオンラインか）
- [ ] 楽観的ロック + 競合時警告ダイアログ

### Phase 3: 部分共有（1.5週間）
- [ ] share_scopes テーブル + RLS ポリシー拡張
- [ ] 共有設定UI（タスク/フェーズ単位での招待）
- [ ] limited_viewer のビュー制限（許可外タスクは非表示）
- [ ] 有効期限付き共有リンク

### Phase 4: 更新リクエスト + 承認ワークフロー（1.5週間）
- [ ] update_requests API（送信・承認・却下）
- [ ] 更新依頼送信フロー（RequestButton + RequestModal）
- [ ] 担当者の回答フォーム（ResponseForm）
- [ ] 承認者の差分確認・承認/却下UI（ApprovalPanel）
- [ ] アプリ内通知システム（NotificationBell）
- [ ] Resend によるメール通知（依頼・回答・承認/却下）

### Phase 5: 仕上げ・拡張（1週間）
- [ ] タスクの親子階層（サブタスク）
- [ ] 依存関係矢印（SVG path）
- [ ] ダッシュボード統計（完了率・遅延タスク数）
- [ ] Ganttチャートのエクスポート（PNG）
- [ ] E2Eテスト（Playwright）

---

## 重要ファイル一覧

| 優先度 | ファイル | 内容 |
|---|---|---|
| 1 | `supabase/migrations/001_initial_schema.sql` | 全テーブル定義 |
| 2 | `supabase/migrations/002_rls_policies.sql` | 部分共有のセキュリティ基盤 |
| 3 | `supabase/migrations/003_triggers_and_functions.sql` | 承認ワークフロー自動化 |
| 4 | `src/lib/supabase/client.ts` | 全機能の通信基盤 |
| 5 | `src/lib/repositories/taskRepository.ts` | GanttとSheet両方が依存 |
| 6 | `src/lib/realtime/RealtimeProvider.tsx` | 共同編集の核心 |
| 7 | `src/components/gantt/GanttChart.tsx` | 最も実装コストが高い |
| 8 | `src/components/update-request/ApprovalPanel.tsx` | 承認ワークフローのUI核心 |

---

## 検証方法

### 機能別テスト手順

**1. 共同編集**
1. 2つのブラウザで同一プロジェクトを開く
2. 片方でタスクの日付をドラッグ変更
3. もう片方に即時反映されることを確認（< 500ms）

**2. 部分共有**
1. オーナーが特定タスクのみ別ユーザーに共有
2. 別ユーザーとして同じURLにアクセス
3. 共有対象外のタスクが表示されないことを確認
4. Supabase Studio で RLS ポリシーの動作を直接確認

**3. 更新リクエスト承認ワークフロー（E2E）**
1. 管理者がタスク行の「更新依頼」ボタン押下
2. 担当者に通知が届くことを確認（アプリ内 + メール）
3. 担当者が回答フォームで新しい日程・進捗を入力・送信
4. 承認者（依頼した管理者）に通知が届くことを確認
5. 承認者が差分を確認し「承認」を実行
6. Ganttチャートのタスクバーが更新されることを確認
7. 「却下」シナリオで Gantt が変更されないことを確認

**4. スケールテスト**
- 50タスクのプロジェクトで Gantt の表示・操作レスポンスを確認
- Supabase Realtime の Concurrent Connection 数をモニタリング

---

## スケール見積もり

| 項目 | 数値 | 対応方針 |
|---|---|---|
| 総ユーザー数 | 300人 | Supabase Free/Pro で十分対応 |
| 同時接続 | 50人 | Supabase Realtime (Pro: 500接続まで) |
| タスク数/プロジェクト | 10〜200 | 仮想スクロール不要、通常の DOM 描画で十分 |
| プロジェクト/ユーザー | 複数 | ダッシュボードにページネーション実装 |
