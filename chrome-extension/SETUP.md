# Chrome Extension セットアップ & Chrome Web Store 公開ガイド

> **⚠️ 開発中・未リリース / Work In Progress — Not Yet Released**
>
> このディレクトリの内容は **開発中のプロトタイプ** です。現時点では Chrome Web Store への公開は行っていません。
> 本コードの無断転載・マーケットプレイスへの無断公開は著作権侵害となります。
> 著作権については [`chrome-extension/LICENSE`](./LICENSE) を参照してください。

このドキュメントでは、**Markdown to Google Slides Chrome Extension** のセットアップ手順と Chrome Web Store への公開手順を説明します。

---

## 必要なもの

| 項目 | 内容 |
|------|------|
| Google アカウント | 開発用・公開用 |
| Google Cloud Project | OAuth2 認証情報の発行に必要 |
| Chrome Web Store 開発者アカウント | 初回登録料あり（金額は公式サイトで要確認） |

---

## 1. Google Cloud Project のセットアップ

### 1-1. プロジェクトを作成する

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 左上のプロジェクト選択 → **「新しいプロジェクト」** をクリック
3. プロジェクト名（例: `markdown-to-slides-extension`）を入力して作成

### 1-2. Google Slides API を有効化する

1. 左メニュー → **「APIとサービス」** → **「ライブラリ」**
2. 検索ボックスに `Google Slides API` と入力
3. **「Google Slides API」** をクリック → **「有効にする」**

### 1-3. OAuth2 同意画面を設定する

1. 左メニュー → **「APIとサービス」** → **「OAuth 同意画面」**
2. ユーザーの種類: **「外部」** を選択 → **「作成」**
3. 以下を入力する:
   - アプリ名: `Markdown to Google Slides`
   - ユーザーサポートメール: 自分のメールアドレス
   - デベロッパーの連絡先情報: 自分のメールアドレス
4. **「スコープを追加または削除」** をクリック → `https://www.googleapis.com/auth/presentations` を追加
5. 保存して次へ

### 1-4. OAuth2 クライアント ID を作成する

1. 左メニュー → **「APIとサービス」** → **「認証情報」**
2. **「認証情報を作成」** → **「OAuth クライアント ID」**
3. アプリケーションの種類: **「Chrome アプリ」** を選択
4. 名前: `Markdown to Google Slides Extension`
5. **アプリケーション ID** には、拡張機能の ID を入力する（後述）
6. **「作成」** をクリックしてクライアント ID をコピーする

---

## 2. 拡張機能の ID を取得する

Chrome 拡張機能の ID は、Chrome Web Store に公開するか、開発者モードで読み込むことで確定します。

### 開発中（ローカルテスト）の場合

1. Chrome を開いて `chrome://extensions` にアクセス
2. 右上の **「デベロッパーモード」** を ON にする
3. **「パッケージ化されていない拡張機能を読み込む」** をクリック
4. この `chrome-extension/` フォルダを選択する
5. 拡張機能カードに表示される **ID**（例: `abcdefghijklmnopabcdefghijklmnop`）をコピーする

### 本番（Chrome Web Store 公開後）の場合

Chrome Web Store に公開すると、本番用の永続的な ID が割り当てられます。

---

## 3. manifest.json にクライアント ID を設定する

`manifest.json` の `oauth2.client_id` を取得したクライアント ID に更新します:

```json
"oauth2": {
  "client_id": "123456789-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/presentations"
  ]
}
```

---

## 4. ローカルでテストする

1. `chrome://extensions` でデベロッパーモードを ON にする
2. **「パッケージ化されていない拡張機能を読み込む」** → `chrome-extension/` フォルダを選択
3. ブラウザツールバーに 📘 アイコンが表示されればインストール完了
4. アイコンをクリックしてポップアップを開く
5. Google スライドの URL（または ID）を貼り付け、Markdown テキストを入力して **「スライドを自動生成する」** を押す
6. 初回は Google アカウントへのアクセス許可が求められる

---

## 5. Chrome Web Store への公開手順

### 5-1. 拡張機能を ZIP にまとめる

```bash
cd markdown-to-google-slides-gas/
zip -r extension.zip chrome-extension/
```

### 5-2. Chrome Web Store デベロッパーダッシュボードへ登録

1. [Chrome Web Store デベロッパーダッシュボード](https://chrome.google.com/webstore/devconsole) にアクセス
2. 初回は登録料が必要です（金額は [Chrome Web Store デベロッパーダッシュボード](https://chrome.google.com/webstore/devconsole) で最新情報をご確認ください）
3. **「新しいアイテム」** をクリック → ZIP ファイルをアップロード
4. 以下の情報を入力する:

| 項目 | 内容（例） |
|------|-----------|
| 名前 | Markdown to Google Slides |
| 説明（短） | Markdown を貼り付けるだけで Google スライドを自動生成 |
| 説明（詳細） | 下記参照 |
| カテゴリ | 生産性 |
| スクリーンショット | ポップアップの画面キャプチャ（1〜5枚） |
| アイコン | 128×128 PNG |

#### 詳細説明（例）

```
Marp 形式の Markdown テキストを Google スライドに自動変換します。

■ 主な機能
・ Markdown テキストをペーストしてワンクリックでスライド生成
・ Marp の区切り線（---）でスライドを自動分割
・ スピーカーノート（<!-- speaker_note -->）に対応
・ 既存スライドのデザイン・テンプレートを崩さず追記

■ 使い方
1. 流し込み先の Google スライドの URL を入力
2. Marp 形式の Markdown テキストを貼り付け
3. 「スライドを自動生成する」ボタンをクリック

■ 権限について
Google スライドの編集に必要な presentations スコープのみ使用します。
```

### 5-3. プライバシーポリシーの準備

Chrome Web Store への公開には、プライバシーポリシーのページ（URL）が必要です。
GitHub Pages や Notion などで簡易的なポリシーページを作成してください。

最低限記載すべき内容:
- 収集するデータ（本拡張機能はユーザーデータを外部サーバーに送信しません）
- Google Slides API の使用目的
- データの保持期間

### 5-4. 審査と公開

1. 入力内容を確認して **「審査のために送信」** をクリック
2. 通常 1〜3 営業日で審査が完了する
3. 承認されると Chrome Web Store に公開される

---

## 6. OAuth2 同意画面の検証（公開時に必要）

アプリを外部ユーザーに公開する前に、Google による **OAuth2 アプリの検証** が必要になる場合があります。

- スコープが `presentations` のみであれば検証は比較的簡単です
- Google の審査フォームに従って申請してください
- 審査には数週間かかる場合があります

---

## 7. よくある質問

### Q: GAS 版との違いは何ですか？

| 項目 | GAS 版 | Chrome 拡張版 |
|------|--------|--------------|
| インストール | スライドごとにコピペ | 一度インストールで全スライドに使える |
| 起動方法 | スライドメニューから | ブラウザツールバーから |
| 認証 | 不要（スライド所有者として実行） | Google OAuth2 |
| オフライン | 不可 | 不可（API 通信が必要） |

### Q: どの Google アカウントでも使えますか？

OAuth2 同意画面が「外部」かつ Google による検証済みであれば、任意の Google アカウントで利用できます。検証前は、テストユーザーとして登録したアカウントのみ使用できます。

### Q: スライドのデザイン（マスター）は保持されますか？

はい。`TITLE_AND_BODY` レイアウトを使って既存のプレゼンテーションにスライドを**追記**するため、マスターレイアウトは保持されます。

---

## ライセンス

MIT License – このリポジトリの `LICENSE` ファイルを参照してください。
