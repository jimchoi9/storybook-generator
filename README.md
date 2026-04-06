# README

# 작업순서

1. prompt.md 이용해서 페이지별 이미지 프롬프트 작성
  - gemini 는 일괄적으로 처리 못하고 중간에 생략함, step 별로 나눠서 진행
  - claude 는 한 번에 전체 페이지 프롬프트 작성 가능
2. 이미지 생성 (예: flow 등)
  - 생성 후 이미지 파일명은 1.jpeg, 2.jpeg ... 형식으로 storybook/{폴더이름}/images/ 폴더에 저장
3. tts_generator.mts 이용해서 페이지별 MP3 생성
4. video.ts 이용해서 페이지별 MP4 생성
  - 영상들 확인하고 이상한 부분은 따로 직접 생성하는게 나을 수도 있음
5. 업로드


# storybook-tts-generator

ElevenLabs API를 사용해 동화책 텍스트를 한국어/영어 MP3 오디오로 변환하고, Runware API를 사용해 이미지를 영상으로 변환하는 도구입니다.

## 요구사항

- Node.js
- ElevenLabs API 키 (TTS 생성)
- Runware API 키 (영상 생성)

## 설치

```bash
npm install
```

## 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 API 키를 입력합니다.

```
ELEVENLABS_API_KEY=your_elevenlabs_api_key
RUNWARE_API_KEY=your_runware_api_key
```

## 동화책 데이터 준비

`storybook/` 폴더 안에 동화 이름으로 폴더를 만들고, `tts.json` 파일을 작성합니다.

```
storybook/
└── my_story/
    └── tts.json
```

`tts.json` 형식:

```json
{
  "story_data": [
    {
      "page": 1,
      "ko": "한국어 텍스트",
      "en": "English text"
    },
    {
      "page": 2,
      "ko": "한국어 텍스트",
      "en": "English text"
    }
  ]
}
```

## 실행

```bash
npx tsx tts_generator.mts <동화이름>
```

예시:

```bash
npx tsx tts_generator.mts my_story
```

## 출력

실행 후 `storybook/<동화이름>/audio/` 폴더에 페이지별 MP3 파일이 생성됩니다.

```
storybook/
└── my_story/
    ├── tts.json
    └── audio/
        ├── page_1_ko.mp3
        ├── page_1_en.mp3
        ├── page_2_ko.mp3
        ├── page_2_en.mp3
        └── ...
```

---

## video.ts — 이미지를 영상으로 변환

Runware API를 사용해 이미지 파일을 5초 MP4 영상으로 변환합니다.

### 데이터 준비

폴더 안에 `video.json` 파일을 작성합니다.
생성한 이미지들을 `images/` 폴더에 넣습니다.


```
Marie_Curie/
├── Marie_Curie_video.json
└── images/
    ├── page_1.png
    ├── page_2.png
    └── ...
```

`video.json` 형식:

```json
{
  "image_data": [
    {
      "page": 1,
      "imagePath": "Marie_Curie/images/page_1.png",
      "prompt": "A gentle camera movement over the illustration"
    },
    {
      "page": 2,
      "imagePath": "Marie_Curie/images/page_2.png",
      "prompt": "Slow zoom in on the character"
    }
  ]
}
```

### 실행

```bash
npx tsx video.ts <폴더명>
```

예시:

```bash
npx tsx video.ts Marie_Curie
```

### 출력

```
Marie_Curie/
├── Marie_Curie_video.json
├── results.json        ← 성공/실패 결과 요약
└── videos/
    ├── page_1.mp4
    ├── page_2.mp4
    └── ...
```

### 영상 설정

`video.ts` 상단의 `CONFIG`에서 설정을 변경할 수 있습니다.

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `width` / `height` | 544 / 736 | 영상 해상도 (3:4 비율) |
| `duration` | 5 | 영상 길이 (초) |
| `concurrency` | 5 | 동시 처리 수 |
| `cameraFixed` | true | 카메라 고정 여부 |

---

## 음성 설정

`tts_generator.mts` 상단에서 음성 및 파라미터를 조정할 수 있습니다.

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `stability` | 0.3 | 목소리 안정성. 낮을수록 생동감 있음 |
| `similarityBoost` | 0.75 | 원본 목소리 유사도 |
| `style` | 0.85 | 스타일 과장 정도. 높을수록 극적인 나레이션 |
| `speed` | 0.7 | 말하기 속도. 1.0이 기본 |
| `useSpeakerBoost` | true | 목소리 선명도 향상 |

음성 ID를 변경하려면 코드 상단의 `VOICE_ID_KO`, `VOICE_ID_EN` 값을 수정하세요.
