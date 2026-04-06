import { Runware } from "@runware/sdk-js";
import fs from "fs";
import path from "path";
import "dotenv/config";

// ──────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────
interface VideoTask {
  imagePath: string;
  prompt: string;
}

interface TaskResult {
  imagePath: string;
  status: "success" | "failed";
  videoURL?: string;
  localPath?: string;
  error?: string;
  durationMs: number;
}

// ──────────────────────────────────────────
// 설정값 (필요 시 수정)
// ──────────────────────────────────────────
const CONFIG = {
  apiKey: process.env.RUNWARE_API_KEY ?? "", // .env의 RUNWARE_API_KEY
  model: "bytedance:2@2",
  width: 544,           // 3:4 근사 (지원 해상도 중 최근접)
  height: 736,
  duration: 5,          // 영상 길이 (초)
  providerSettings: {
    bytedance: {
      cameraFixed: true,
    },
  },
  concurrency: 5, // 동시 실행 수 (추천: 5)
  maxRetries: 3, // SDK globalMaxRetries
  timeoutDuration: 120_000, // SDK 타임아웃 (ms)
  // outputDir, outputFile 은 폴더명 기반으로 동적 생성 (bulkCreateVideos 참고)
};

// ──────────────────────────────────────────
// 유틸: 진행률 표시
// ──────────────────────────────────────────
function printProgress(done: number, total: number, results: TaskResult[]) {
  const success = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const bar = "█".repeat(done) + "░".repeat(total - done);
  process.stdout.write(
    `\r[${bar}] ${done}/${total}  ✅ ${success}  ❌ ${failed}`,
  );
}

// ──────────────────────────────────────────
// 유틸: 작업 중 경과 시간 스피너
// ──────────────────────────────────────────
function startSpinner(label: string): () => void {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const startTime = Date.now();
  const timer = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    process.stdout.write(`\r${frames[i++ % frames.length]} ${label} (${elapsed}s 경과...)`);
  }, 200);
  return () => clearInterval(timer);
}

// ──────────────────────────────────────────
// 유틸: 영상 URL → 로컬 파일로 저장
// ──────────────────────────────────────────
async function downloadVideo(videoURL: string, destPath: string): Promise<void> {
  const res = await fetch(videoURL);
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(destPath, buffer);
}

// ──────────────────────────────────────────
// 단일 작업 처리 (업로드 → 영상 생성)
// SDK globalMaxRetries 로 재시도 위임
// ──────────────────────────────────────────
async function processTask(
  runware: InstanceType<typeof Runware>,
  task: VideoTask,
  index: number,
  outputDir: string,
): Promise<TaskResult> {
  const startTime = Date.now();
  const fileName = path.basename(task.imagePath);
  let stopSpinner: (() => void) | undefined;

  try {
    // 1) 이미지 읽기 → base64 Data URI 변환 (Node.js 환경)
    const fileBuffer = await fs.promises.readFile(task.imagePath);
    const ext      = path.extname(task.imagePath).slice(1).toLowerCase();
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const base64   = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    // 2) 이미지 업로드
    process.stdout.write(`\n  ⬆️  [${index + 1}] ${fileName} 업로드 중...`);
    const uploadResult = await runware.imageUpload({ image: base64 });

    // 3) 영상 생성
    stopSpinner = startSpinner(`  🎬 [${index + 1}] ${fileName} 영상 생성 중`);
    const videoResponse = await runware.videoInference({
      frameImages: [uploadResult.imageURL],
      positivePrompt: task.prompt,
      model: CONFIG.model,
      width: CONFIG.width,
      height: CONFIG.height,
      duration: CONFIG.duration,
      providerSettings: CONFIG.providerSettings,
    });

    stopSpinner();
    const videoURL = Array.isArray(videoResponse) ? videoResponse[0].videoURL : videoResponse.videoURL;

    // 4) 로컬 저장
    const baseName  = path.basename(task.imagePath, path.extname(task.imagePath));
    const localPath = path.join(outputDir, `${baseName}.mp4`);
    process.stdout.write(`\n  💾 [${index + 1}] ${fileName} 저장 중...`);
    await downloadVideo(videoURL!, localPath);

    return {
      imagePath: task.imagePath,
      status: "success",
      videoURL,
      localPath,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    stopSpinner?.();
    const errMsg = error?.message ?? JSON.stringify(error) ?? String(error);
    console.error(
      `\n  ⚠️  [${index + 1}] ${fileName} 실패: ${errMsg}`,
    );
    return {
      imagePath: task.imagePath,
      status: "failed",
      error: errMsg,
      durationMs: Date.now() - startTime,
    };
  }
}

// ──────────────────────────────────────────
// 동시성 제어: 슬라이딩 윈도우 (진짜 concurrency)
// 청크 방식과 달리 완료 즉시 다음 작업 시작
// ──────────────────────────────────────────
async function runWithConcurrency(
  runware: InstanceType<typeof Runware>,
  tasks: VideoTask[],
  outputDir: string,
): Promise<TaskResult[]> {
  const results: TaskResult[] = new Array(tasks.length);
  let nextIndex = 0;
  let done = 0;

  async function runNext(): Promise<void> {
    const index = nextIndex++;
    if (index >= tasks.length) return;

    results[index] = await processTask(runware, tasks[index], index, outputDir);
    done++;
    printProgress(done, tasks.length, results.filter(Boolean));

    return runNext();
  }

  // concurrency 만큼 워커 동시 시작
  const workers = Array.from(
    { length: Math.min(CONFIG.concurrency, tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);

  return results;
}

// ──────────────────────────────────────────
// 결과 저장 (JSON) + 요약 출력
// ──────────────────────────────────────────
function saveAndSummarize(results: TaskResult[], outputFile: string) {
  fs.writeFileSync(
    outputFile,
    JSON.stringify(results, null, 2),
    "utf-8",
  );

  const success = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");
  const avgMs = results.reduce((s, r) => s + r.durationMs, 0) / results.length;

  console.log("\n\n══════════════════════════════════════");
  console.log("📊  최종 결과 요약");
  console.log("══════════════════════════════════════");
  console.log(`  전체 작업:  ${results.length}개`);
  console.log(`  ✅ 성공:    ${success.length}개`);
  console.log(`  ❌ 실패:    ${failed.length}개`);
  console.log(`  ⏱  평균 소요: ${(avgMs / 1000).toFixed(1)}초`);
  console.log(`  💾 결과 저장: ${outputFile}`);

  if (success.length > 0) {
    console.log("\n  📹 생성된 영상:");
    success.forEach((r) =>
      console.log(`    ${path.basename(r.imagePath)} → ${r.localPath}`),
    );
  }

  if (failed.length > 0) {
    console.log("\n  ⛔ 실패한 파일:");
    failed.forEach((r) =>
      console.log(`    ${path.basename(r.imagePath)} — ${r.error}`),
    );
  }

  console.log("══════════════════════════════════════");
}

// ──────────────────────────────────────────
// 메인 진입점
// ──────────────────────────────────────────
async function loadTasksFromJson(jsonPath: string): Promise<VideoTask[]> {
  const raw = await fs.promises.readFile(jsonPath, "utf-8");
  const data = JSON.parse(raw) as {
    image_data: { page: number; imagePath: string; prompt: string }[];
  };
  return data.image_data.map(({ imagePath, prompt }) => ({ imagePath, prompt }));
}

async function bulkCreateVideos() {
  const folderName = process.argv[2];
  if (!folderName) {
    console.error("❌ 폴더명을 입력해주세요. 예: npx tsx video.ts Marie_Curie");
    process.exit(1);
  }
  const jsonPath = `./storybook/${folderName}/video.json`;
  const tasks = await loadTasksFromJson(jsonPath);

  // 파일 존재 여부 사전 검증
  const missing = tasks.filter((t) => !fs.existsSync(t.imagePath));
  if (missing.length > 0) {
    console.error("❌ 다음 파일을 찾을 수 없습니다:");
    missing.forEach((t) => console.error(`   ${t.imagePath}`));
    process.exit(1);
  }

  // 폴더명 기반 출력 경로
  const outputDir  = `./storybook/${folderName}/videos`;
  const outputFile = `./storybook/${folderName}/results.json`;
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(
    `🚀 ${tasks.length}개 작업 시작 (동시 실행: ${CONFIG.concurrency}개)\n`,
  );

  // SDK 비동기 초기화 + 내장 재시도 설정
  const runware = await Runware.initialize({
    apiKey: CONFIG.apiKey,
    globalMaxRetries: CONFIG.maxRetries,
    timeoutDuration: CONFIG.timeoutDuration,
  });

  // 연결 확인 후 배치 시작
  await runware.ensureConnection();

  const results = await runWithConcurrency(runware, tasks, outputDir);

  saveAndSummarize(results, outputFile);

  await runware.disconnect();
}

bulkCreateVideos().catch((err) => {
  console.error("예기치 못한 오류:", err);
  process.exit(1);
});
