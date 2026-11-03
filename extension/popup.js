const checkbox = document.getElementById("enabled");
const quizCheckbox = document.getElementById("quizMode");
const status = document.getElementById("status");

chrome.storage.local.get({ enabled: false, quizMode: false }).then(({ enabled, quizMode }) => {
  checkbox.checked = enabled;
  quizCheckbox.checked = quizMode;
});

quizCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ quizMode: quizCheckbox.checked });
});

checkbox.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: checkbox.checked });
  if (checkbox.checked) await prepareModel();
});

// The click is a user gesture, which Chrome requires to start the model download.
async function prepareModel() {
  if (!("Translator" in self)) {
    status.textContent = "이 브라우저는 번역 기능을 지원하지 않습니다. 데스크톱 Chrome 138 이상이 필요합니다.";
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
