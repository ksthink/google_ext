# 드래그 영어 번역

영어 공부용 Chrome 익스텐션입니다. 팝업에서 기능을 켠 뒤 영어 텍스트를 드래그하면 마우스 아래 툴팁으로 한국어 번역을 보여줍니다.

## 번역 엔진

- **Gemini (`gemini-3.5-flash-lite`):** [Google AI Studio](https://aistudio.google.com/apikey)에서 발급한 API 키를 팝업에 입력하면 사용합니다. 드래그한 글이 Google로 전송되며, 무료 등급에서는 Google 제품 개선에 쓰일 수 있습니다. 키는 내보낼 수 없는 AES-GCM 키로 암호화해 이 브라우저에만 저장하며, 저장 후에는 다시 볼 수 없습니다. 팝업의 점이 녹색이면 연결됨, 빨간색이면 연결 안 됨입니다.
- **Chrome 내장 번역:** 키가 없을 때 [Translator API](https://developer.chrome.com/docs/ai/translator-api)로 기기 안에서 처리합니다. 데스크톱 Chrome 138 이상의 HTTPS 페이지에서 동작하며, 처음 켤 때 번역 모델을 내려받습니다.

## 학습 모드

팝업에서 **학습 모드**를 켜면 번역이 가려진 채로 나타나고, 클릭해야 보입니다. 먼저 뜻을 떠올려 본 뒤 확인할 수 있습니다.

익스텐션 소스는 `extension/` 폴더에 있습니다.

## 빌드 결과물 내려받기

브랜치에 푸시하면 GitHub Actions가 익스텐션을 아티팩트로 올립니다.

1. 저장소의 **Actions** 탭에서 해당 커밋의 **Build extension** 실행을 엽니다.
2. 페이지 아래 **Artifacts**에서 `extension-<커밋 해시>`를 내려받습니다. 보관 기간은 기본 90일입니다.
3. 내려받은 zip 파일의 압축을 풉니다.

## Chrome에 설치하기

1. `chrome://extensions`를 엽니다.
2. 오른쪽 위 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드합니다**를 누르고 압축을 푼 폴더를 선택합니다.
