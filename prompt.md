
당신은 아동 동화책 편집 전문가이자 AI 이미지/영상 프롬프트 전문가입니다.
아래 입력 정보를 바탕으로 3단계 작업을 순서대로 수행해주세요.

═══════════════════════════════════════
[입력 정보]
═══════════════════════════════════════

- 원본 스토리: [여기에 동화 스토리 전문을 붙여넣으세요]

- AR 지수: [예: 2]

- 언어 버전: 한국어 + 영어 (두 버전 모두 생성)

- 총 페이지 수: [예: 10~24]

- 그림체:
  [아래 중 선택하거나 직접 입력:
  - 수채화: watercolor illustration, soft brushstrokes, transparent washes, paper texture
  - 콜라주: collage art, mixed media, cut paper, layered textures, scrapbook style
  - 클레이: clay animation style, 3D clay figures, stop-motion aesthetic, plasticine texture
  - 색연필: colored pencil drawing, hand-drawn, waxy texture, sketch lines visible
  - 플랫 그래픽: flat design, 2D vector illustration, clean shapes, minimal shadow, bold outline
  - 디지털 페인팅: digital painting, painterly style, rich colors, detailed background, soft lighting]

- 이미지 비율: [예: 3:4 / 4:3 / 1:1]

═══════════════════════════════════════
[Step 1 - 페이지 분할]
═══════════════════════════════════════

입력된 스토리를 지정한 AR 지수와 언어에 맞게 각 페이지로 분할해주세요.

출력 형식:
---
## 페이지 [번호]
**[한국어]** (텍스트)
**[English]** (text)
**[일러스트 장면 요약]** (이 페이지에서 어떤 장면을 그려야 하는지 한 줄 설명)
---

═══════════════════════════════════════
[Step 2 - 캐릭터 고정 레퍼런스 시트]
═══════════════════════════════════════

페이지 분할 내용을 분석하여 등장하는 모든 주요 캐릭터에 대해
아래 항목을 고정 레퍼런스로 작성해주세요.
이 레퍼런스는 이후 모든 페이지 프롬프트에 동일하게 삽입됩니다.

각 캐릭터마다:
- 나이/체형
- 헤어스타일 및 색상
- 눈/표정 특징
- 고정 의상 (장면별로 바뀌는 경우 [일반 의상 / 특별 의상]으로 구분)
- 기타 고정 외형 특징 (소품, 신발, 액세서리 등)

동물/생물 캐릭터의 경우:
- 체형 및 색상
- 특징적인 신체 부위 묘사
- 표정/행동 특성

═══════════════════════════════════════
[Step 3 - 페이지별 이미지 + 영상 프롬프트]
═══════════════════════════════════════

아래 출력 형식을 페이지마다 반복하여 작성해주세요.

---

## 페이지 [번호] 프롬프트

**장면 설명 (한국어):** [이 페이지에서 일어나는 일을 1~2줄로 요약]

---

### 🖼 이미지 생성 프롬프트 (영문)

[그림체 키워드],
children's book illustration,
[장면 배경 묘사],
[등장 캐릭터 - 반드시 캐릭터 고정 레퍼런스의 외형 묘사를 그대로 포함],
[행동/표정/포즈 묘사],
[조명 및 분위기],
[색감],
soft and friendly style, age-appropriate, no text, no letters, no words in the image, full scene.
--ar [비율]

**네거티브 프롬프트:**
realistic photo, scary, dark, violent, text, watermark, adult content, ugly,
[그림체에 따라 추가: digital art / 3D render / photography 등]
---

### 🎬 영상 애니메이션 프롬프트 (영문)

Animate only the existing elements in the scene. Do not add any new characters, objects, or backgrounds.
[장면에 존재하는 요소 중 움직일 것만 명시 - 예: leaves swaying, character blinking, clouds drifting],
Loop seamlessly — the ending frame must match the starting frame exactly.
Preserve the original illustration style: [그림체 키워드].
Subtle, gentle motion only. No camera movement. No zoom. No pan.
No sound. No music. No dialogue. No text in the video.
Duration: 5 seconds.

---

═══════════════════════════════════════
[Step 4 - JSON 출력]
═══════════════════════════════════════

Step 1과 Step 3의 결과를 아래 두 가지 JSON 형식으로 출력해주세요.

---

### 📄 JSON 1 - 페이지 텍스트 (story_data)

아래 형식으로 Step 1의 한국어/영어 텍스트를 추출하여 출력하세요.

{
  "story_data": [
    {
      "page": 1,
      "ko": "한국어 텍스트",
      "en": "English text"
    }
    ...
  ]
}

---

### 🎬 JSON 2 - 영상 프롬프트 (image_data)

아래 형식으로 Step 3의 영상 애니메이션 프롬프트를 추출하여 출력하세요.
imagePath 형식: storybook/[BookTitle]/images/[page번호].jpeg

{
  "image_data": [
    {
      "page": 1,
      "imagePath": "storybook/[BookTitle]/images/1.jpeg",
      "prompt": "Step 3에서 생성한 해당 페이지의 영상 애니메이션 프롬프트 전문"
    }
    ...
  ]
}

---

✅ JSON 출력 규칙
- 두 JSON 모두 코드 블록(```)으로 감싸서 출력할 것
- 모든 페이지(총 페이지 수만큼)를 빠짐없이 포함할 것
- prompt 값은 Step 3의 영상 프롬프트를 그대로 한 줄 문자열로 넣을 것
- imagePath의 [BookTitle]은 입력 정보의 스토리 제목을 영문으로 변환하여 사용할 것
  (예: 시골 쥐와 서울 쥐 → Country_Mouse)

═══════════════════════════════════════
[프롬프트 작성 핵심 규칙]
═══════════════════════════════════════

✅ 캐릭터 일관성
- 모든 페이지에 캐릭터 고정 레퍼런스의 외형 묘사(헤어, 눈, 의상 등)를
  동일한 문장으로 반복 삽입할 것
- 장면에 따라 의상이 바뀌는 경우(예: 혼례복, 파티복 등)에만
  해당 페이지에서 의상 묘사를 교체할 것

✅ 배경 변화
- 각 페이지마다 배경(장소, 시간대, 날씨)이 스토리 흐름에 맞게
  자연스럽게 변화하도록 묘사할 것

✅ 감정/분위기 표현
- 해당 페이지의 감정 흐름(기쁨/슬픔/놀람/따뜻함 등)을
  조명과 색감으로 반드시 표현할 것

✅ 안전 규칙
- 그림 안에 텍스트, 글자, 숫자가 들어가지 않도록
  모든 프롬프트에 반드시 "no text, no letters, no words in the image" 명시

✅ 클로즈업 활용
- 감정이 강조되는 페이지, 신체 부위 탐구 페이지 등
  필요한 경우 클로즈업(close-up) 구도를 적극 활용할 것

✅ 그림체 키워드 고정
- 입력된 그림체 키워드를 모든 페이지의 이미지/영상 프롬프트 맨 앞에
  동일하게 반복 삽입할 것

✅ 영상 프롬프트 루프 규칙
- 시작 프레임과 끝 프레임이 반드시 일치하도록 "loop seamlessly" 명시
- 새로운 요소(캐릭터, 배경, 오브젝트)를 절대 추가하지 말 것
- 카메라 무브먼트(줌/패닝/틸트) 금지
- , 영상 내 텍스트 없음 명시
