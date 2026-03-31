/**
 * Markdown (Marp format) processing logic.
 * Ported from Code.gs (Google Apps Script) for use in the Chrome extension.
 */

/**
 * Remove all HTML comments (<!-- ... -->) from a string.
 * Loops until no more comments are found to handle edge cases where
 * a single pass could leave residual comment syntax.
 *
 * @param {string} str
 * @returns {string}
 */
function removeHtmlComments(str) {
  let prev;
  do {
    prev = str;
    str = str.replace(/<!--[\s\S]*?-->/g, "");
  } while (str !== prev);
  return str;
}

/**
 * Parse Markdown text into an array of slide objects.
 * Each slide object has { titleText, bodyText, notesText }.
 *
 * @param {string} markdownText - Raw Markdown (Marp-style) text.
 * @returns {{ titleText: string, bodyText: string, notesText: string }[]}
 */
function parseMarkdown(markdownText) {
  // Normalize line endings
  let text = markdownText.replace(/\r\n/g, "\n");

  // Remove front-matter header block (--- ... ---)
  let cleanedText = text.replace(/^---[\s\S]*?---\n/, "");

  // Split into individual slide blocks at slide separators
  const slideBlocks = cleanedText.split(/\n---\n/);

  const slides = [];

  slideBlocks.forEach((block) => {
    if (!block.trim()) return; // Skip empty blocks

    let titleText = "";
    let bodyText = "";
    let notesText = "";

    // Extract title from the first # heading
    const titleMatch = block.match(/^#\s+(.*)$/m);
    if (titleMatch) {
      titleText = titleMatch[1].trim();
    }

    // Separate speaker notes from body
    const noteSplit = block.split("<!-- speaker_note -->");
    if (noteSplit.length > 1) {
      bodyText = noteSplit[0];
      // Remove remaining HTML comments from the notes section
      notesText = removeHtmlComments(noteSplit[1]).trim();
    } else {
      bodyText = block;
    }

    // Remove the title line and HTML comments from body
    if (titleMatch) {
      bodyText = bodyText.replace(titleMatch[0], "");
    }
    bodyText = removeHtmlComments(bodyText).trim();

    // ── Markdown decoration cleanup ──────────────────────────────────
    // 1. Fenced code blocks → readable block with code label
    const CODE_LABEL = "【コード】";
    bodyText = bodyText.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```[a-zA-Z]*\n?|```/g, "").trim();
      return "\n" + CODE_LABEL + "\n" + code + "\n";
    });

    // 2. Inline code → Japanese corner brackets
    bodyText = bodyText.replace(/`(.*?)`/g, "「$1」");

    // 3. Bold and italic markers → plain text
    bodyText = bodyText.replace(/\*\*(.*?)\*\*/g, "$1");
    bodyText = bodyText.replace(/\*(.*?)\*/g, "$1");

    // 4. Sub-headings → visual prefixes
    bodyText = bodyText.replace(/^###\s+(.*)/gm, "◆ $1");
    bodyText = bodyText.replace(/^##\s+(.*)/gm, "■ $1");

    // 5. Bullet hyphens → Japanese bullet dot
    bodyText = bodyText.replace(/^(\s*)-\s+/gm, "$1・ ");

    // Skip slides with no content
    if (!titleText && !bodyText) return;

    slides.push({ titleText, bodyText, notesText });
  });

  return slides;
}
