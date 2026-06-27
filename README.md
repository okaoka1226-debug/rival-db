# 競合分析DB — 三宮エリア

## ファイル構成
```
competitor-db/
├── index.html   メインHTML
├── style.css    スタイル
├── app.js       ロジック（LocalStorage対応）
└── README.md    このファイル
```

## GitHub Pagesでの公開手順

1. GitHubに新リポジトリ作成（例: `rival-db`）
2. この3ファイルをpush
3. Settings > Pages > Branch: main > / (root) > Save
4. `https://[ユーザー名].github.io/rival-db/` でアクセス可能

## Firebase Firestoreへの移行（データ共有が必要な場合）

`app.js` の先頭コメントアウト部分を解除し、
Firebaseコンソールでプロジェクト作成→設定値を記入するだけ。

現状はLocalStorageで動作するため、**ブラウザごとにデータが独立**。
社長・役職と共有するにはFirebase化を推奨。

## URLスクレイピングのAPI連携

`analyzeURL()` 関数内の `setTimeout` 部分を
AnthropicAPI or バックエンドエンドポイントに差し替える。

## 機能一覧
- 競合店舗の登録（手動 / URL解析）
- AI総合スコア（HP/プロフ/口コミ/価格/在籍の5軸）
- 価格・指名料・女子バック試算の一覧
- 自店設定と競合比較テーブル
- 業態フィルター・並び替え
- 店舗詳細モーダル（AI総評・スコアバー）
- データはLocalStorage保存（Firebase移行可）
