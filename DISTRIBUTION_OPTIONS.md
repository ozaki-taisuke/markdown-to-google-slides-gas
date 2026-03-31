# 配布方法・選択肢の調査ドキュメント

このドキュメントは、**Markdown to Google Slides** ツールを広く普及させるための各種配布方法・選択肢を比較・整理したものです。Chrome拡張機能だけでなく、様々なアプローチを検討するための参考資料として活用してください。

---

## 目次

1. [選択肢の全体比較](#1-選択肢の全体比較)
2. [各選択肢の詳細](#2-各選択肢の詳細)
   - [A. Chrome拡張機能（Chrome Web Store）](#a-chrome拡張機能chrome-web-store)
   - [B. Google Workspace エディタアドオン（Workspace Marketplace）](#b-google-workspace-エディタアドオンworkspace-marketplace)
   - [C. GAS Web アプリ（Apps Script Web App）](#c-gas-web-アプリapps-script-web-app)
   - [D. スタンドアロン Web アプリ](#d-スタンドアロン-web-アプリ)
   - [E. VS Code 拡張機能（VS Code Marketplace）](#e-vs-code-拡張機能vs-code-marketplace)
   - [F. Obsidian プラグイン](#f-obsidian-プラグイン)
   - [G. CLI ツール（npm パッケージ）](#g-cli-ツールnpm-パッケージ)
3. [需要分析と普及方法](#3-需要分析と普及方法)
4. [推奨ロードマップ](#4-推奨ロードマップ)
5. [参考リンク・出典](#5-参考リンクと出典)

---

## 1. 選択肢の全体比較

| # | 配布方法 | 実装コスト | 審査の有無 | 想定ユーザー数 | 認証の複雑さ | 現在の状況 |
|---|----------|-----------|-----------|--------------|------------|---------|
| A | Chrome拡張機能 | 低〜中 | あり（CWS） | 数千〜数万 | 中（OAuth2） | ✅ 実装済み |
| B | Workspace アドオン | 中 | あり（Marketplace） | 数万〜数十万 | 低（GAS自動） | 🔲 未実装 |
| C | GAS Web アプリ | 低 | なし | 数十〜数百 | 低（Google認証） | 🔲 未実装 |
| D | Web アプリ | 高 | なし | 数千〜 | 中（OAuth2 PKCE） | 🔲 未実装 |
| E | VS Code 拡張 | 中 | あり（VSIX Marketplace） | 数千 | 中（OAuth2） | 🔲 未実装 |
| F | Obsidian プラグイン | 中 | あり（Community） | 数千 | 中（OAuth2） | 🔲 未実装 |
| G | CLI ツール（npm） | 中 | なし | 数百〜数千 | 中〜高 | 🔲 未実装 |

---

## 2. 各選択肢の詳細

---

### A. Chrome拡張機能（Chrome Web Store）

**現在このリポジトリで実装済みの方式です。**

#### 概要

Chrome のツールバーにボタンを追加し、どのページを開いていてもポップアップから Markdown をスライドに変換できます。Google Slides REST API を直接呼び出す方式です。

#### メリット

- **インストール一度で全スライドファイルに使える**（GAS版は毎回コピペが必要）
- Chrome Web Store 経由で発見されやすく、ユーザー獲得の窓口になる
- **Manifest V3**（Chrome の最新標準）に対応しており、将来の互換性が高い
- `chrome.identity` API で OAuth2 フローをブラウザが自動処理してくれる

#### デメリット

- **OAuth2 クライアント ID をユーザー自身が発行・設定する必要がある**（一般ユーザーには難しい）
- Google による OAuth2 アプリ審査（「確認済みアプリ」）の取得に時間がかかる（数週間〜数ヶ月）
- Chrome 専用のため Firefox / Safari ユーザーは使えない
- Chrome Web Store 初回登録料が必要（2025年時点で $5 USD）

#### 実装状況

```
chrome-extension/
├── manifest.json     # Manifest V3 設定
├── popup.html        # ポップアップ UI
├── popup.js          # OAuth2 + Slides API
├── markdown.js       # Marp パーサー
└── icons/            # アイコン画像
```

#### 参考

- Chrome Web Store 公開手順 → `chrome-extension/SETUP.md`
- 公式ドキュメント: https://developer.chrome.com/docs/extensions/
- CWS デベロッパーダッシュボード: https://chrome.google.com/webstore/devconsole

---

### B. Google Workspace エディタアドオン（Workspace Marketplace）

#### 概要

Google Slides に直接組み込まれるネイティブ拡張機能です。GAS（Google Apps Script）で開発でき、Google Workspace Marketplace に公開します。ユーザーは Slides のメニューから1クリックでインストールできます。

**現在の GAS版（Code.gs）を発展させる最も自然な方向性です。**

#### メリット

- **Google Slides に完全に統合される**（外部ツール不要）
- 認証は GAS が自動処理するため、ユーザーに OAuth2 の知識は不要
- **Google Workspace Marketplace からインストール可能**で発見性が非常に高い
- GAS のコードベースを大きく変更せずに対応できる
- Google ドライブユーザー（全世界で約 30 億人以上）がターゲット

#### デメリット

- Google Workspace Marketplace への公開には審査がある
- アドオンの `appsscript.json` マニフェスト設定が必要
- 無料プランと有料プランでの公開方針を決める必要がある

#### 実装概要

GAS のプロジェクトに `appsscript.json` を追加し、アドオンとして登録するだけです。現在の `Code.gs` の `onOpen()` / `showSidebar()` / `processMarkdown()` の構造はほぼそのまま使えます。

```json
// appsscript.json（追加・修正が必要な箇所）
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "addOns": {
    "common": {
      "name": "Markdown to Google Slides",
      "logoUrl": "https://example.com/icon.png"
    },
    "slides": {}
  }
}
```

#### 参考

- Google Workspace Add-ons 概要: https://developers.google.com/workspace/add-ons/overview
- Editor Add-ons ドキュメント: https://developers.google.com/apps-script/add-ons/editors/slides
- Workspace Marketplace 公開ガイド: https://developers.google.com/workspace/marketplace/how-to-publish

---

### C. GAS Web アプリ（Apps Script Web App）

#### 概要

既存の GAS コードに `doGet()` 関数を追加するだけで、**URLを共有するだけで誰でも使えるWebアプリ**として公開できます。最もコストが低く、最速で公開できる方法です。

#### メリット

- **追加コストがほぼゼロ**（GAS のコードに数十行追加するだけ）
- 審査なし・登録料なし
- URL をシェアするだけで誰でもアクセスできる
- Google アカウント認証は GAS 側で自動処理
- インストール不要で使える（チーム内への展開に最適）

#### デメリット

- Google アカウントを持っていない人は使えない
- プレゼンテーション ID を URL パラメータで渡す仕組みが必要
- 公開方法が「全員（匿名を含む）」か「Googleアカウント保有者のみ」か選択が必要
- スケールに限界がある（GAS の実行回数・時間制限）

#### 実装概要

```javascript
// Code.gs に追加するだけ
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Markdown to Google Slides')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

#### 参考

- GAS Web App ドキュメント: https://developers.google.com/apps-script/guides/web
- 公開手順: https://developers.google.com/apps-script/guides/web#deploy_a_script_as_a_web_app

---

### D. スタンドアロン Web アプリ

#### 概要

React / Next.js / Vue などのフロントエンドフレームワークで開発し、Vercel・Netlify・GitHub Pages 等にデプロイする独立したWebアプリです。

#### メリット

- **Chrome 以外のブラウザ（Firefox, Safari, Edge）でも動作**
- スマートフォン・タブレットにも対応可能
- UI の自由度が最も高い
- ユーザー登録・ログイン・履歴機能など高度な機能を実装できる

#### デメリット

- **実装コストが最も高い**（フロントエンド + OAuth2 PKCE フロー + API 連携）
- Google による OAuth2 アプリ審査が必要（`presentations` スコープのみでも審査対象）
- ホスティング費用が発生する可能性がある
- ユーザーが URL を直接開く必要があり、発見されにくい

#### 技術スタック例

```
フロントエンド: React + TypeScript
OAuth2: Google Identity Services (GIS) ライブラリ
API: Google Slides REST API
デプロイ: Vercel（無料プランあり）
```

#### 参考

- Google Identity Services: https://developers.google.com/identity/oauth2/web/guides/overview
- Google Slides REST API: https://developers.google.com/slides/api/reference/rest
- Vercel: https://vercel.com/

---

### E. VS Code 拡張機能（VS Code Marketplace）

#### 概要

Visual Studio Code の拡張機能として開発・公開します。Markdown ファイルを編集中のエディタから直接 Google Slides に変換できます。

#### メリット

- **Markdown を書くユーザーの大半が VS Code を使っている**（親和性が高い）
- VS Code Marketplace は無料で公開でき、審査も比較的簡単
- `vscode.window.showInputBox` 等のネイティブ UI を使えるため UX が高い
- Marp for VS Code（人気拡張）との差別化・補完関係が成立する

#### デメリット

- TypeScript での開発が必要（JavaScript でも可能だが型安全性の確保が難しい）
- VS Code ユーザー以外は使えない
- OAuth2 フローを VS Code 内で処理する仕組みの実装が必要

#### 実装概要

```typescript
// extension.ts（エントリポイント例）
import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand('markdownToSlides.convert', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const markdown = editor.document.getText();
    // OAuth2 → Slides API
  });
  context.subscriptions.push(cmd);
}
```

#### 参考

- VS Code Extension API: https://code.visualstudio.com/api
- VS Code Marketplace 公開ガイド: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- Marp for VS Code（競合・参考実装）: https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode

---

### F. Obsidian プラグイン

#### 概要

ノートアプリ Obsidian のコミュニティプラグインとして開発・公開します。Obsidian はマークダウンベースのナレッジ管理ツールで、Marp 形式との親和性が高いです。

#### メリット

- **Obsidian ユーザーはマークダウンへの習熟度が高く、このツールの価値を理解しやすい**
- コミュニティプラグインの審査は比較的シンプル（GitHub PR ベース）
- Obsidian のプラグインエコシステムは活発で、発見性が高い（プラグイン総数 1,000 以上）

#### デメリット

- Obsidian ユーザー限定（ニッチなターゲット）
- Obsidian のプラグイン API を習得する必要がある
- Obsidian は無料版でもコミュニティプラグインが使えるが、エコシステムの変化が速い

#### 参考

- Obsidian Plugin Developer Docs: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
- コミュニティプラグイン申請: https://github.com/obsidianmd/obsidian-releases

---

### G. CLI ツール（npm パッケージ）

#### 概要

Node.js 製の CLI ツールとして `npm publish` で公開します。`npx markdown-to-slides input.md --presentation-id xxxxx` のように使います。

#### メリット

- **CI/CD パイプラインへの組み込みが可能**（発表資料の自動生成など）
- エンジニア・技術系ユーザーへのリーチが高い
- npm のエコシステムに乗ることで発見性が高まる

#### デメリット

- Node.js のインストールが必要なため一般ユーザーには敷居が高い
- OAuth2 フローを CLI で処理する仕組みが複雑（ローカルサーバーを立てる等）
- サービスアカウントを使う場合は Google Cloud のセットアップが必要

#### 参考

- npm 公開ガイド: https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages
- Google Auth Library for Node.js: https://github.com/googleapis/google-auth-library-nodejs

---

## 3. 需要分析と普及方法

### 需要の根拠

このツールが解決する課題（**Marp → PowerPoint → Google Slides でデザインが壊れる問題**）は、以下のユーザー層に広く存在します：

| ユーザー層 | 規模感 | ペインポイント |
|-----------|--------|-------------|
| 研修・教育担当者 | 大（企業・学校） | 研修資料を毎回手作業でスライドに流し込む手間 |
| コンサルタント・エンジニア | 大（IT業界） | Marp で書いた資料を顧客向けスライドに変換したい |
| Marp ユーザー全般 | 中（技術者層） | Marp → PPTX 変換でテンプレートが壊れる問題 |
| Google Workspace 利用企業 | 非常に大 | 社内テンプレートを維持したままスライドを量産したい |

**Marp の GitHub リポジトリ**はスター数が 13,000 以上（2024年時点）あり、技術者コミュニティでの認知度は高いです。  
参考: https://github.com/marp-team/marp

### 効果的な普及方法

#### 短期（1〜2ヶ月）

1. **Zenn / Qiita への技術記事投稿**
   - 「Marp から Google スライドにデザインを崩さず流し込む方法」
   - GAS版・Chrome拡張版の両方を紹介
   - 参考: https://zenn.dev / https://qiita.com

2. **Twitter（X）/ LinkedIn でのシェア**
   - 動作デモ GIF を添付すると拡散されやすい
   - `#GoogleSlides` `#Marp` `#GAS` `#生産性` タグを活用

3. **GitHub の README を充実させ、Star を獲得する**
   - バッジ（Star 数・ライセンス）を追加
   - デモ画像・GIF を掲載

#### 中期（3〜6ヶ月）

4. **Google Workspace Marketplace への公開**（選択肢 B を実装）
   - Google の公式マーケットプレイス経由で数万人へのリーチが期待できる

5. **YouTube デモ動画の制作**
   - 「3分でわかる Markdown → Google Slides 自動生成」等のタイトル

6. **Product Hunt への投稿**
   - 英語圏の開発者・プロダクトマネージャーへのリーチ
   - 参考: https://www.producthunt.com

#### 長期（6ヶ月〜）

7. **Marp 公式コミュニティ・関連 OSS への貢献・言及依頼**
   - Marp の GitHub Discussion / Discussions へのポスト

8. **npm パッケージとしての公開**（選択肢 G を実装）
   - エンジニアによる CI/CD への組み込みで利用が拡大

---

## 4. 推奨ロードマップ

コストと効果のバランスを考えると、以下の順序で取り組むことを推奨します：

```
Phase 1（今すぐできる）
  ├─ [A] Chrome拡張機能 ✅ 実装済み → Chrome Web Store への公開
  └─ Zenn/Qiita 記事で GAS版・Chrome拡張版を紹介

Phase 2（1〜2ヶ月後）
  └─ [B] Google Workspace エディタアドオン化
        └─ Workspace Marketplace への公開（最大の普及効果）

Phase 3（必要に応じて）
  ├─ [C] GAS Web アプリ → チーム内展開・デモ用途
  ├─ [E] VS Code 拡張機能 → エンジニア向けリーチ拡大
  └─ [G] CLI ツール → CI/CD 対応・技術者向け
```

---

## 5. 参考リンクと出典

以下は各選択肢の公式ドキュメントおよび関連リソースの一覧です（2025年時点）。

### Chrome拡張機能

| リソース | URL |
|---------|-----|
| Chrome Extensions ドキュメント（公式） | https://developer.chrome.com/docs/extensions/ |
| Manifest V3 移行ガイド | https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3 |
| chrome.identity API | https://developer.chrome.com/docs/extensions/reference/identity/ |
| Chrome Web Store デベロッパーダッシュボード | https://chrome.google.com/webstore/devconsole |
| CWS 公開ポリシー | https://developer.chrome.com/docs/webstore/program-policies/ |

### Google Workspace アドオン

| リソース | URL |
|---------|-----|
| Workspace Add-ons 概要（公式） | https://developers.google.com/workspace/add-ons/overview |
| Editor Add-ons for Slides | https://developers.google.com/apps-script/add-ons/editors/slides |
| Workspace Marketplace 公開ガイド | https://developers.google.com/workspace/marketplace/how-to-publish |

### Google Slides API / GAS

| リソース | URL |
|---------|-----|
| Google Slides REST API リファレンス | https://developers.google.com/slides/api/reference/rest |
| Apps Script Web App ガイド | https://developers.google.com/apps-script/guides/web |
| Google Identity Services（OAuth2） | https://developers.google.com/identity/oauth2/web/guides/overview |

### VS Code 拡張機能

| リソース | URL |
|---------|-----|
| VS Code Extension API（公式） | https://code.visualstudio.com/api |
| VS Marketplace 公開手順 | https://code.visualstudio.com/api/working-with-extensions/publishing-extension |
| Marp for VS Code（参考実装） | https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode |

### Obsidian プラグイン

| リソース | URL |
|---------|-----|
| Obsidian Plugin Developer Docs | https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin |
| Community Plugins 申請（GitHub） | https://github.com/obsidianmd/obsidian-releases |

### npm / CLI

| リソース | URL |
|---------|-----|
| npm 公開ガイド（公式） | https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages |
| Google Auth Library（Node.js） | https://github.com/googleapis/google-auth-library-nodejs |

### 普及・マーケティング

| リソース | URL |
|---------|-----|
| Zenn（日本語技術記事） | https://zenn.dev |
| Qiita（日本語技術記事） | https://qiita.com |
| Product Hunt | https://www.producthunt.com |
| Marp 公式 GitHub | https://github.com/marp-team/marp |

---

*最終更新: 2025年*  
*このドキュメントは調査・検討段階の資料です。各URLの情報は変更される場合があります。最新情報は各公式ドキュメントをご参照ください。*
