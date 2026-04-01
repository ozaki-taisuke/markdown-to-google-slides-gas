/**
 * MarkdownからGoogleスライドを指定テンプレートへ流し込む専用スクリプト (UI付きツール版)
 * 
 * =======================
 * 使い方
 * =======================
 * 1. 納品用テンプレートスライド（空）を開き、[拡張機能] > [Apps Script] を開く
 * 2. このファイルの内容を `コード.gs` に全てコピペして保存（Ctrl+S）する
 * 3. スライドの画面に戻り、F5キーで画面をリロードする
 * 4. 上部のメニューに「📘 Markdown流し込み」というボタンが現れるのでクリック
 * 5. 右側に出てくる枠（サイドバー）の中にMarkdownテキストを貼り付けて実行ボタンを押す
 */

// 1. アドオンが Marketplace からインストールされたとき（初回）に呼び出される
function onInstall(e) {
  onOpen(e);
}

// 2. メニューバーにカスタムメニューを追加する
function onOpen(e) {
  const ui = SlidesApp.getUi();
  ui.createMenu('📘 Markdown流し込み')
    .addItem('スライド自動生成ツールを開く', 'showSidebar')
    .addToUi();
}

// 3. サイドバーを表示する
function showSidebar() {
  const sampleMarkdown = getSampleMarkdown();
  // JSON.stringify でエスケープしてJS文字列リテラルとして安全に埋め込む
  const sampleJson = JSON.stringify(sampleMarkdown);

  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: sans-serif; padding: 10px;">
      <h3>Markdown流し込みツール</h3>
      <p style="font-size: 12px; color: #666;">Marp形式のテキストをペーストしてください。</p>
      <button onclick="insertSample()" style="width: 100%; padding: 8px; margin-bottom: 8px; background-color: #34A853; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
        ✨ サンプルフォーマットを挿入
      </button>
      <textarea id="mdText" style="width: 100%; height: 460px; margin-bottom: 10px; padding: 5px; box-sizing: border-box;" placeholder="---&#10;marp: true&#10;---&#10;&#10;# タイトル..."></textarea>
      <br>
      <button onclick="run()" style="width: 100%; padding: 10px; background-color: #4285F4; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
        スライドを自動生成する
      </button>
      <div id="status" style="margin-top: 15px; color: #555; text-align: center; font-weight: bold;"></div>
    </div>
    <script>
      const SAMPLE = ${sampleJson};

      function insertSample() {
        const ta = document.getElementById('mdText');
        if (ta.value && !confirm("入力済みのテキストを上書きしてサンプルを挿入しますか？")) {
          return;
        }
        ta.value = SAMPLE;
      }

      function run() {
        const text = document.getElementById('mdText').value;
        if (!text) {
          alert("テキストを入力してください！");
          return;
        }
        document.getElementById('status').innerText = "⏱️ 生成中...（数秒〜十数秒かかります）";
        
        // GAS側の processMarkdown 関数を呼び出す
        google.script.run
          .withSuccessHandler(function(result) {
            document.getElementById('status').innerText = "✅ " + result;
          })
          .withFailureHandler(function(err) {
            document.getElementById('status').innerText = "❌ エラー: " + err.message;
          })
          .processMarkdown(text);
      }
    </script>
  `)
  .setTitle('Markdownからスライド生成');

  SlidesApp.getUi().showSidebar(html);
}

// 3b. サンプルMarkdownを返す（「サンプル挿入」ボタン用）
function getSampleMarkdown() {
  return [
    "---",
    "marp: true",
    "---",
    "",
    "# スライド1: タイトル",
    "",
    "ここに本文を書きます。",
    "",
    "- 箇条書き1",
    "- 箇条書き2",
    "",
    "<!-- スピーカーノートをここに書きます。HTMLコメント形式（Marp互換）で書いてください。 -->",
    "",
    "---",
    "",
    "# スライド2: コード例",
    "",
    "```javascript",
    "const greeting = \"Hello, World!\";",
    "console.log(greeting);",
    "```",
    "",
    "<!-- このスライドでは、JavaScriptのサンプルコードを説明します。 -->",
    "",
    "---",
    "",
    "# スライド3: まとめ",
    "",
    "- ポイント1",
    "- ポイント2",
    "- ポイント3",
    "",
    "<!-- まとめのポイントを口頭で補足してください。 -->"
  ].join("\n");
}

// 4. 実際の流し込み処理（バックグラウンドで実行される）
function processMarkdown(markdownText) {
  const presentation = SlidesApp.getActivePresentation();
  
  // 改行コードの揺れを修正 (\r\n を \n に統一)
  let text = markdownText.replace(/\r\n/g, "\n");

  // Front-matter ヘッダーブロック（冒頭の --- から ---）を削除
  let cleanedText = text.replace(/^---[\s\S]*?---\n/, "");
  
  // スライドごとに分割（改行 + --- + 改行）
  const slideBlocks = cleanedText.split(/\n---\n/);
  
  let addedCount = 0;

  slideBlocks.forEach((block) => {
    if (!block.trim()) return; // 空ブロックは無視
    
    let titleText = "";
    let bodyText = "";
    let notesText = "";
    
    // タイトルの抽出（# 行）
    let titleMatch = block.match(/^#\s+(.*)$/m);
    if (titleMatch) {
      titleText = titleMatch[1].trim();
    }
    
    // スピーカーノートの分離
    // 旧フォーマット: <!-- speaker_note --> 以降をノートとして扱う（後方互換）
    // Marp互換フォーマット: HTMLコメント（<!-- ... -->）の内容をノートとして扱う
    if (block.indexOf("<!-- speaker_note -->") !== -1) {
      const noteSplit = block.split("<!-- speaker_note -->");
      bodyText = noteSplit[0];
      notesText = noteSplit[1].replace(/<!--[\s\S]*?-->/g, "").trim();
    } else {
      // Marp互換: HTMLコメントの内容をノートとして収集する
      const noteMatches = block.match(/<!--([\s\S]*?)-->/g);
      if (noteMatches) {
        notesText = noteMatches
          .map(function(c) { return c.replace(/^<!--\s*/, "").replace(/\s*-->$/, "").trim(); })
          .filter(function(c) { return c.length > 0; })
          .join("\n\n");
      }
      bodyText = block;
    }
    
    // 本文の掃除（タイトル行を消し、HTMLコメントを除去）
    if(titleMatch) {
      bodyText = bodyText.replace(titleMatch[0], ""); 
    }
    bodyText = bodyText.replace(/<!--[\s\S]*?-->/g, "").trim();

    // ==========================================
    // ✅ Markdown特有の装飾記号のクリーンアップ処理
    // ==========================================
    // 1. コードブロック処理（``` を見やすいブロックに）
    bodyText = bodyText.replace(/```[\s\S]*?```/g, function(match){
      return "\n【コード】\n" + match.replace(/```[a-zA-Z]*\n?|```/g, "").trim() + "\n";
    });
    // 2. インラインコード（` `）を鉤括弧に変換
    bodyText = bodyText.replace(/`(.*?)`/g, "「$1」");
    
    // 3. 太字や斜体の記号（** や *）を削除
    bodyText = bodyText.replace(/\*\*(.*?)\*\*/g, "$1");
    bodyText = bodyText.replace(/\*(.*?)\*/g, "$1");
    
    // 4. 小見出しの見栄え調整（# を図形に）
    bodyText = bodyText.replace(/^###\s+(.*)/gm, "◆ $1");
    bodyText = bodyText.replace(/^##\s+(.*)/gm, "■ $1");
    
    // 5. 箇条書きのハイフンを箇条書き用の黒ポチ（・）へ変換
    bodyText = bodyText.replace(/^(\s*)-\s+/gm, "$1・ ");
    // タイトルも本文も何もない場合は無視
    if (!titleText && !bodyText) return;

    // スライドの追加（PredefinedLayout.TITLE_AND_BODYを使用）
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
    addedCount++;
    
    // タイトル配置
    if (titleText) {
      const titleShape = slide.getPlaceholder(SlidesApp.PlaceholderType.TITLE);
      if (titleShape) {
        titleShape.asShape().getText().setText(titleText);
      }
    }
    
    // 本文配置
    if (bodyText) {
      const bodyShape = slide.getPlaceholder(SlidesApp.PlaceholderType.BODY);
      if (bodyShape) {
        bodyShape.asShape().getText().setText(bodyText);
      }
    }
    
    // 台本（スピーカーノート）配置
    if (notesText) {
      const notesShape = slide.getNotesPage().getSpeakerNotesShape();
      if (notesShape) {
        notesShape.getText().setText(notesText);
      }
    }
  });

  if (addedCount === 0) {
    throw new Error("スライド可能なテキストが見つかりませんでした。区切り線(---)が含まれているか確認してください。");
  }
  
  return addedCount + "枚のスライドを生成しました！";
}
