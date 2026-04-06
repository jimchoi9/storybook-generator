import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createWriteStream, mkdirSync, readFileSync } from "fs";
import { Readable } from "stream";
import "dotenv/config";

// const VOICE_ID_EN = "JBFqnCBsd6RMkjVDRZzb"; // 영어 음성 (George)
const VOICE_ID_EN = "flHkNRp1BlvT73UL6gyz"; // 영어 음성 Jessica Anne Bogart - Eloquent Villain
const VOICE_ID_KO = "ksaI0TCD9BstzEzlxj4q";  // Seulki - Inviting

const storyName = process.argv[2];

if (!storyName) {
  console.error("사용법: npx tsx tts_generator.mts <동화이름>");
  console.error("예시: npx tsx tts_generator.mts bremen");
  process.exit(1);
}

const jsonPath = `storybook/${storyName}/tts.json`;
const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));

if (!Array.isArray(raw.story_data)) {
  console.error("story_data 배열이 없는 JSON 형식입니다.");
  process.exit(1);
}

type StoryItem = { page: number; ko: string; en: string };
const storyData: StoryItem[] = raw.story_data;

const langs: { key: "ko" | "en"; voiceId: string }[] = [
  { key: "ko", voiceId: VOICE_ID_KO },
  { key: "en", voiceId: VOICE_ID_EN },
];

mkdirSync(`storybook/${storyName}/audio`, { recursive: true });

const elevenlabs = new ElevenLabsClient();

const voiceSettings = {
  stability: 0.3,        // 목소리 안정성 (0~1) | 낮을수록 감정 표현이 다양하고 생동감 있음, 높을수록 일관되고 차분함
  similarityBoost: 0.75, // 원본 목소리 유사도 (0~1) | 높을수록 학습된 목소리에 가깝게 재현
  style: 0.85,            // 스타일 과장 정도 (0~1) | 높을수록 더 극적이고 표현력 있는 나레이션 (v2 이상 모델만 지원)
  speed: 0.7,            // 말하기 속도 (0.7~1.2) | 1.0이 기본, 낮을수록 천천히 또박또박
  useSpeakerBoost: true, // 목소리 선명도 향상 여부 | true 시 고음질로 렌더링 (연산 비용 증가)
};

let totalCharCount = 0;

const tasks = storyData.flatMap((item) =>
  langs.map(({ key, voiceId }) => ({ page: `page_${item.page}`, text: item[key], key, voiceId }))
);

// 동시 요청 수 제한 (ElevenLabs 409 충돌 방지)
const CONCURRENCY = 3;
for (let i = 0; i < tasks.length; i += CONCURRENCY) {
  await Promise.all(
    tasks.slice(i, i + CONCURRENCY).map(async ({ page, text, key, voiceId }) => {

      const { data: audio, rawResponse } = await elevenlabs.textToSpeech
        .convert(voiceId, {
          text,
          modelId: key === "ko" ? "eleven_multilingual_v2" : "eleven_v3",
          outputFormat: "mp3_44100_128",
          languageCode: key === "ko" ? "ko" : "en",
          voiceSettings,
        })
        .withRawResponse();

      const charCount = Number(rawResponse.headers.get("x-character-count") ?? 0);
      const requestId = rawResponse.headers.get("request-id");
      totalCharCount += charCount;

      const filename = `storybook/${storyName}/audio/${page + '_' + key}.mp3`;
      Readable.from(audio).pipe(createWriteStream(filename));
      console.log(`[${key}][${page}] 저장 완료: ${filename} | 글자 수: ${charCount} | request-id: ${requestId}`);
    })
  );
}

console.log(`\n총 사용 글자 수: ${totalCharCount}`);
