const STATUS_CHECK_MS = 10000;

const checkbox = document.getElementById("enabled");
const quizCheckbox = document.getElementById("quizMode");
const status = document.getElementById("status");
const keyForm = document.getElementById("keyForm");
const apiKeyInput = document.getElementById("apiKey");
const deleteButton = document.getElementById("deleteKey");
const dot = document.getElementById("dot");
const connection = document.getElementById("connection");

let hasKey = false;
let latestCheck = 0;

// Every reply is applied only if it's the newest, so a slow check can't overwrite a save.
async function send(message) {
  const check = ++latestCheck;
  const reply = await chrome.runtime.sendMessage(message);
  if (check === latestCheck) render(reply);
}

function render({ hasKey: saved, connected, reason, error }) {
  hasKey = Boolean(saved);
  dot.className = connected ? "connected" : "disconnected";
  connection.textContent = error ?? reason;
  deleteButton.hidden = !hasKey;
  apiKeyInput.placeholder = hasKey ? "저장됨 · 새 키를 입력하면 교체됩니다" : "API 키 입력";
}

const refresh = () => send({ type: "getStatus" });

chrome.storage.local.get({ enabled: false, quizMode: false }).then(({ enabled, quizMode }) => {
  checkbox.checked = enabled;
  quizCheckbox.checked = quizMode;
});

quizCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ quizMode: quizCheckbox.checked });
});

keyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiKey = apiKeyInput.value.trim();
  // Cleared first so the key stays in the page for as short a time as possible.
  apiKeyInput.value = "";
  if (apiKey) await send({ type: "saveApiKey", apiKey });
});

deleteButton.addEventListener("click", () => send({ type: "deleteApiKey" }));

refresh();
setInterval(refresh, STATUS_CHECK_MS);
addEventListener("online", refresh);
addEventListener("offline", refresh);

checkbox.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: checkbox.checked });
  // Gemini needs no local model, so skip the download when a key is set.
  if (checkbox.checked && !hasKey) await prepareModel();
});

// The click is a user gesture, which Chrome requires to start the model download.
async function prepareModel() {
  if (!("Translator" in self)) {
    status.textContent = "이 브라우저는 내장 번역을 지원하지 않습니다. 데스크톱 Chrome 138 이상이 필요합니다.";
    return;
  }
  status.textContent = "번역 모델을 준비하는 중… 처음에는 몇 분 걸릴 수 있습니다.";
  try {
    await Translator.create({
      sourceLanguage: "en",
      targetLanguage: "ko",
      monitor(m) {
        m.addEventListener("downloadprogress", ({ loaded }) => {
          status.textContent = `번역 모델 내려받는 중… ${Math.round(loaded * 100)}%`;
        });
      },
    });
    status.textContent = "준비됐습니다. 영어 텍스트를 드래그해 보세요.";
  } catch (error) {
    status.textContent = `번역 모델을 준비하지 못했습니다: ${error.message}`;
  }
}
