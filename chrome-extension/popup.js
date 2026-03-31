/**
 * popup.js – Chrome extension popup logic.
 *
 * Flow:
 *  1. User enters (or the page auto-detects) a Google Slides presentation ID.
 *  2. User pastes Markdown text.
 *  3. On click the extension:
 *     a. Obtains a Google OAuth2 access token via chrome.identity.
 *     b. Parses the Markdown into slide objects.
 *     c. Calls the Google Slides REST API to append slides to the presentation.
 */

const SLIDES_API = "https://slides.googleapis.com/v1/presentations";

// ── UI helpers ───────────────────────────────────────────────────────────────

function setStatus(message, isError = false) {
  const el = document.getElementById("status");
  el.textContent = message;
  el.className = "status " + (isError ? "error" : message ? "info" : "");
}

function setLoading(loading) {
  const btn = document.getElementById("runBtn");
  btn.disabled = loading;
  btn.textContent = loading ? "⏱️ 生成中..." : "スライドを自動生成する";
}

// ── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Obtain an OAuth2 access token interactively.
 * @returns {Promise<string>} access token
 */
function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

// ── Google Slides API helpers ────────────────────────────────────────────────

/**
 * Fetch metadata for a presentation to verify access and read existing slides.
 */
async function getPresentation(token, presentationId) {
  const resp = await fetch(`${SLIDES_API}/${presentationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

/**
 * Execute a batchUpdate on the presentation.
 */
async function batchUpdate(token, presentationId, requests) {
  const resp = await fetch(`${SLIDES_API}/${presentationId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

/**
 * Build the batchUpdate requests needed to append slides.
 * Returns { createRequests, noteRequests, slideIds } where:
 *   - createRequests creates slides and inserts title/body text.
 *   - slideIds maps slide index → objectId (for retrieving notes shapes later).
 */
function buildCreateRequests(slides) {
  const createRequests = [];
  const slideIds = [];

  slides.forEach(({ titleText, bodyText }, i) => {
    const ts = Date.now();
    const slideId = `slide_${ts}_${i}`;
    const titleId = `title_${ts}_${i}`;
    const bodyId = `body_${ts}_${i}`;

    slideIds.push(slideId);

    // Create slide with TITLE_AND_BODY layout
    createRequests.push({
      createSlide: {
        objectId: slideId,
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
        placeholderIdMappings: [
          {
            layoutPlaceholder: { type: "TITLE", index: 0 },
            objectId: titleId,
          },
          {
            layoutPlaceholder: { type: "BODY", index: 0 },
            objectId: bodyId,
          },
        ],
      },
    });

    // Insert title text
    if (titleText) {
      createRequests.push({
        insertText: {
          objectId: titleId,
          insertionIndex: 0,
          text: titleText,
        },
      });
    }

    // Insert body text
    if (bodyText) {
      createRequests.push({
        insertText: {
          objectId: bodyId,
          insertionIndex: 0,
          text: bodyText,
        },
      });
    }
  });

  return { createRequests, slideIds };
}

/**
 * Fetch the speakerNotes objectIds for the given slide IDs, then build
 * insertText requests to populate speaker notes.
 *
 * @param {string} token - OAuth2 access token.
 * @param {string} presentationId - Presentation ID.
 * @param {{ notesText: string }[]} slides - Slide objects (notesText used).
 * @param {string[]} slideIds - objectIds of the newly created slides.
 * @returns {Promise<object[]>} batchUpdate request array.
 */
async function buildNotesRequestsAsync(token, presentationId, slides, slideIds) {
  const presentation = await getPresentation(token, presentationId);
  const noteRequests = [];

  slides.forEach(({ notesText }, i) => {
    if (!notesText) return;

    const slideId = slideIds[i];
    const slide = presentation.slides.find((s) => s.objectId === slideId);
    if (!slide) return;

    const notesPage = slide.slideProperties?.notesPage;
    if (!notesPage) return;

    // Find the BODY placeholder on the notes page (speaker notes shape)
    const notesShape = notesPage.pageElements?.find(
      (el) => el.shape?.placeholder?.type === "BODY"
    );
    if (!notesShape) return;

    noteRequests.push({
      insertText: {
        objectId: notesShape.objectId,
        insertionIndex: 0,
        text: notesText,
      },
    });
  });

  return noteRequests;
}

// ── Main handler ─────────────────────────────────────────────────────────────

async function run() {
  setStatus("");
  setLoading(true);

  try {
    const presentationInput = document.getElementById("presentationId").value.trim();
    const markdownText = document.getElementById("mdText").value;

    if (!markdownText) {
      throw new Error("Markdownテキストを入力してください。");
    }
    if (!presentationInput) {
      throw new Error("スライドのURLまたはプレゼンテーションIDを入力してください。");
    }

    // Extract presentation ID from a full URL if needed
    const idMatch = presentationInput.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const presentationId = idMatch ? idMatch[1] : presentationInput;

    // 1. Authenticate
    setStatus("🔐 Googleアカウントで認証中...");
    const token = await getAuthToken();

    // 2. Verify access to the presentation
    setStatus("📄 プレゼンテーションを確認中...");
    await getPresentation(token, presentationId);

    // 3. Parse Markdown
    const slides = parseMarkdown(markdownText);
    if (slides.length === 0) {
      throw new Error(
        "スライド可能なテキストが見つかりませんでした。区切り線(---)が含まれているか確認してください。"
      );
    }

    // 4. Create slides (title + body)
    setStatus(`⚙️ ${slides.length}枚のスライドを生成中...`);
    const { createRequests, slideIds } = buildCreateRequests(slides);
    await batchUpdate(token, presentationId, createRequests);

    // 5. Insert speaker notes (requires a second pass to get notes objectIds)
    const hasNotes = slides.some((s) => s.notesText);
    if (hasNotes) {
      setStatus("📝 スピーカーノートを追加中...");
      const noteRequests = await buildNotesRequestsAsync(token, presentationId, slides, slideIds);
      if (noteRequests.length > 0) {
        await batchUpdate(token, presentationId, noteRequests);
      }
    }

    // 6. Save the last-used presentation ID
    chrome.storage.local.set({ lastPresentationId: presentationInput });

    setStatus(`✅ ${slides.length}枚のスライドを生成しました！`);
  } catch (err) {
    setStatus("❌ エラー: " + err.message, true);
  } finally {
    setLoading(false);
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Restore last used presentation ID
  chrome.storage.local.get("lastPresentationId", ({ lastPresentationId }) => {
    if (lastPresentationId) {
      document.getElementById("presentationId").value = lastPresentationId;
    }
  });

  document.getElementById("runBtn").addEventListener("click", run);
});
