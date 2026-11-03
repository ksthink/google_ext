const MAX_LENGTH = 3000;
const CSS = `
  .tooltip {
    position: fixed;
    box-sizing: border-box;
    width: max-content;
    max-width: min(380px, calc(100vw - 16px));
    max-height: 45vh;
    overflow: auto;
    padding: 12px 14px;
    border-radius: 10px;
    background: #fff;
    color: #1a1a1a;
    border: 1px solid #d9d9d9;
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.2);
    font: 16px/1.6 system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    text-align: left;
    white-space: pre-wrap;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
  .translation { font-weight: 500; }
  .hint { display: none; margin-top: 4px; color: #666; font-size: 13px; }
  .concealed { cursor: pointer; }
  .concealed .translation { filter: blur(7px); user-select: none; }
  .concealed .hint { display: block; }
  .original {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #e5e5e5;
    color: #666;
    font-size: 13px;
    line-height: 1.5;
  }
  @media (prefers-color-scheme: dark) {
    .tooltip { background: #26282b; color: #f1f1f1; border-color: #45484d; }
    .original { color: #a8abb0; border-color: #45484d; }
    .hint { color: #a8abb0; }
  }
`;

let enabled = false;
let quizMode = false;
let lastX = 0;
let lastY = 0;
let translatorPromise = null;
let requestId = 0;
let host = null;
let tooltip = null;
let translationEl = null;
let originalEl = null;

chrome.storage.local.get({ enabled: false, quizMode: false }).then((v) => {
  enabled = v.enabled;
  quizMode = v.quizMode;
});
chrome.storage.onChanged.addListener((changes) => {
  if (changes.quizMode) quizMode = changes.quizMode.newValue;
  if (!changes.enabled) return;
  enabled = changes.enabled.newValue;
  if (!enabled) hide();
});

function isEnglish(text) {
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  return latin >= 2 && latin * 2 >= letters;
}

function getTranslator(onProgress) {
  translatorPromise ??= Translator.create({
    sourceLanguage: "en",
    targetLanguage: "ko",
    monitor(m) {
      m.addEventListener("downloadprogress", ({ loaded }) => onProgress(loaded));
    },
  }).catch((error) => {
    translatorPromise = null;
    throw error;
  });
  return translatorPromise;
}

function ensureTooltip() {
  if (host?.isConnected) return;
  host = document.createElement("div");
  host.style.cssText = "all: initial; position: fixed; z-index: 2147483647;";
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = CSS;
  tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.setAttribute("role", "status");
  translationEl = document.createElement("div");
  translationEl.className = "translation";
  originalEl = document.createElement("div");
  originalEl.className = "original";
  const hintEl = document.createElement("div");
  hintEl.className = "hint";
  hintEl.textContent = "뜻을 떠올려 본 뒤 클릭하면 번역이 보입니다.";
  tooltip.append(translationEl, hintEl, originalEl);
  tooltip.addEventListener("click", () => {
    if (!tooltip.classList.contains("concealed")) return;
    setConcealed(false);
    place(lastX, lastY);
  });
  shadow.append(style, tooltip);
  document.documentElement.append(host);
}

function place(x, y) {
  const margin = 8;
  const { width, height } = tooltip.getBoundingClientRect();
  const left = Math.max(margin, Math.min(x, innerWidth - width - margin));
  const below = y + 16;
  // Below the pointer by default; above it only when it would run off the screen.
  const top = below + height <= innerHeight - margin ? below : Math.max(margin, y - height - 12);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function setConcealed(concealed) {
  tooltip.classList.toggle("concealed", concealed);
  translationEl.setAttribute("aria-hidden", String(concealed));
}

function show(message, original, x, y, concealed = false) {
  ensureTooltip();
  lastX = x;
  lastY = y;
  setConcealed(concealed);
  translationEl.textContent = message;
  originalEl.textContent = original;
  originalEl.hidden = !original;
  host.style.display = "block";
  place(x, y);
}

function hide() {
  requestId++;
  // Not the hidden attribute: the host's "all: initial" style overrides it.
  if (host) host.style.display = "none";
}

// Uses Gemini when an API key is saved, otherwise Chrome's on-device translator.
async function requestTranslation(text, onProgress) {
  const { translation, error, noKey } = await chrome.runtime.sendMessage({ type: "translate", text });
  if (error) throw new Error(error);
  if (!noKey) return translation;
  if (!("Translator" in self)) {
    throw new Error("이 페이지에서는 내장 번역을 쓸 수 없습니다. 팝업에 Gemini API 키를 입력하거나 HTTPS 페이지에서 사용해 주세요.");
  }
  const translator = await getTranslator(onProgress);
  return translator.translate(text);
}

async function translateSelection(x, y) {
  const text = getSelection().toString().trim();
  if (!isEnglish(text)) return;
  const id = ++requestId;
  if (text.length > MAX_LENGTH) {
    show(`선택한 글이 너무 깁니다. ${MAX_LENGTH}자 이내로 선택해 주세요.`, "", x, y);
    return;
  }
  show("번역 중…", text, x, y);
  try {
    const translation = await requestTranslation(text, (loaded) => {
      if (id === requestId) show(`번역 모델 내려받는 중… ${Math.round(loaded * 100)}%`, text, x, y);
    });
    if (id === requestId) show(translation, text, x, y, quizMode);
  } catch (error) {
    if (id === requestId) show(`번역하지 못했습니다: ${error.message}`, "", x, y);
  }
}

const isInTooltip = (event) => host !== null && event.composedPath().includes(host);

document.addEventListener(
  "mousedown",
  (event) => {
    if (!isInTooltip(event)) hide();
  },
  true,
);
document.addEventListener(
  "mouseup",
  (event) => {
    if (!enabled || event.button !== 0 || isInTooltip(event)) return;
    // Clicking inside a selection only clears it after mouseup, so read it on the next task.
    setTimeout(() => translateSelection(event.clientX, event.clientY));
  },
  true,
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hide();
});
document.addEventListener("scroll", hide);
