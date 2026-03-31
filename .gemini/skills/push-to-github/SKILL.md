---
name: push-to-github
description: 変更内容を Git にビルド・ステージ・コミットし、GitHub リポジトリにプッシュする手順
---

# push-to-github スキル

このスキルは、NDMS (New Document Management System) の開発において、実装の進捗を GitHub リポジトリ（リモート）へ確実かつ安全に同期させるためのガイドラインを提供します。

## トリガー（実行のタイミング）
- 各タスク（`task.md` の一項目など）の完了時
- 実装が一段落し、ユーザーに動作確認を依頼する直前
- バグ修正などの重要な変更を適用した直後
- GitHub Pages での公開を自動トリガーしたいとき（`main` ブランチへのプッシュ）

## 手順

### 1. 変更の確認
まず、`git status` および `git diff` で意図しない変更が含まれていないか、パス（NFC正規化の有無など）を確認します。

### 2. ステージングとコミット
適切なコミットメッセージ（プレフィックス `[NDMS]` を推奨）を付けてコミットします。

```bash
git add .
git commit -m "[NDMS] {具体的な変更内容}"
```

### 3. プッシュの実行
現在のブランチ（通常は `main`）から `origin` へプッシュします。

```bash
git push origin main
```

### 4. デプロイ状況の確認
プッシュ後、GitHub Actions (`.github/workflows/deploy.yml`) が正常に開始されたことを GitHub の画面、または Actions ステータスで確認します。

## 注意事項
- **コンフリクトの防止**: プッシュ前に可能であれば `git pull` を行い、不整合がないか確認すること。
- **機密情報の除外**: `.env` や個人的な設定ファイルが `.gitignore` に含まれているか、コミット対象になっていないか再確認すること。
