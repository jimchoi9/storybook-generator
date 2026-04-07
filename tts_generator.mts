import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createWriteStream, mkdirSync, readFileSync } from "fs";
import { Readable } from "stream";
import "dotenv/config";

// const VOICE_ID_EN = "JBFqnCBsd6RMkjVDRZzb"; // 영어 음성 (George)
const VOICE_ID_EN = "flHkNRp1BlvT73UL6gyz"; // 영어 음성 Jessica Anne Bogart - Eloquent Villain
const VOICE_ID_KO = "fAgkbajYljImBTPFR28u";  // Amytah - Friendly, Clear and Hollow
// const VOICE_ID_KO = "ksaI0TCD9BstzEzlxj4q";  // Seulki - Inviting

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

const voiceSettingsKo = {
  stability: 0.3,        // 목소리 안정성 (0~1)
  similarityBoost: 1.0,  // 원본 목소리 유사도 (0~1)
  style: 0.46,           // 스타일 과장 정도 (0~1)
  speed: 0.9,            // 말하기 속도
  useSpeakerBoost: true, // 목소리 선명도 향상
};

const voiceSettingsEn = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.85,
  speed: 0.7,
  useSpeakerBoost: true,
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
          voiceSettings: key === "ko" ? voiceSettingsKo : voiceSettingsEn,
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
