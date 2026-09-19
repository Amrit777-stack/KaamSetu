import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(serviceDirectory, "../../data");
const responsesPath = path.join(dataDirectory, "voice-responses.json");
let writePromise = Promise.resolve();

function extractValue(field, transcript) {
  if (field !== "experienceYears") return transcript.trim();

  const numericMatch = transcript.match(/\b(\d+(?:\.\d+)?)\b/);
  if (numericMatch) return Number(numericMatch[1]);

  const wordNumbers = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const wordMatch = transcript.toLowerCase().match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  return wordMatch ? wordNumbers[wordMatch[1]] : transcript.trim();
}

async function readResponses() {
  await mkdir(dataDirectory, { recursive: true });
  try {
    return JSON.parse(await readFile(responsesPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function saveVoiceResponse({ field, transcript, languageCode, languageProbability }) {
  const record = {
    id: randomUUID(),
    field,
    value: extractValue(field, transcript),
    englishTranscript: transcript.trim(),
    detectedLanguageCode: languageCode || null,
    languageProbability: languageProbability ?? null,
    createdAt: new Date().toISOString(),
  };

  writePromise = writePromise.catch(() => undefined).then(async () => {
    const responses = await readResponses();
    responses.push(record);
    const temporaryPath = `${responsesPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(responses, null, 2)}\n`, "utf8");
    await rename(temporaryPath, responsesPath);
  });
  await writePromise;
  return record;
}
