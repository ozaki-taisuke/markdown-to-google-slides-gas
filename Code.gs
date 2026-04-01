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
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: sans-serif; padding: 10px;">
      <h3>Markdown流し込みツール</h3>
      <p style="font-size: 12px; color: #666;">Marp形式のテキストをペーストしてください。</p>
      <textarea id="mdText" style="width: 100%; height: 500px; margin-bottom: 10px; padding: 5px; box-sizing: border-box;" placeholder="---&#10;marp: true&#10;---&#10;&#10;# タイトル..."></textarea>
      <br>
      <button onclick="run()" style="width: 100%; padding: 10px; background-color: #4285F4; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
        スライドを自動生成する
      </button>
      <div id="status" style="margin-top: 15px; color: #555; text-align: center; font-weight: bold;"></div>
    </div>
    <script>
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
    const noteSplit = block.split("<!-- speaker_note -->");
    if (noteSplit.length > 1) {
      bodyText = noteSplit[0];
      // ノート内の不要なHTMLコメントを消去
      notesText = noteSplit[1].replace(/<!--[\s\S]*?-->/g, "").trim(); 
    } else {
      bodyText = block;
    }
    
    // 本文の掃除（タイトル行を消し、時計などのHTMLコメントを消去）
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
