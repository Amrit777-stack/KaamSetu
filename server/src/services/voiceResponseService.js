import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(serviceDirectory, "../../data");
const responsesPath = path.join(dataDirectory, "voice-responses.json");
let writePromise = Promise.resolve();

function cleanExtractedText(value) {
  return value
    .replace(/^[\s,.:;\-]+|[\s,.:;!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractValue(field, transcript) {
  const text = cleanExtractedText(transcript || "");
  if (!text) return null;

  if (field === "experienceYears") {
    const numericMatch = text.match(/\b(\d+(?:\.\d+)?)\b/);
    if (numericMatch) return Number(numericMatch[1]);

    const wordNumbers = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
    };
    const wordMatch = text.toLowerCase().match(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\b/);
    return wordMatch ? wordNumbers[wordMatch[1]] : null;
  }

  const patterns = field === "name"
    ? [
        /(?:my\s+)?name\s+is\s+(.+)/i,
        /(?:i\s+am|i'm|this\s+is)\s+(.+)/i,
      ]
    : [
        /(?:i\s+)?(?:work|working)\s+as\s+(?:an?\s+)?(.+)/i,
        /(?:my\s+)?(?:occupation|profession|job)\s+(?:is\s+)?(?:an?\s+)?(.+)/i,
        /(?:i\s+am|i'm)\s+(?:an?\s+)?(.+)/i,
      ];
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  const extracted = match ? match[1] : text;

  // Discard sentence tails that describe experience rather than the requested field.
  return cleanExtractedText(extracted.replace(/\s*(?:,|and\s+)?\s*(?:with|for|having)\s+\d+.*$/i, "")) || null;
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

export async function saveVoiceResponse({
  field,
  transcript,
  englishTranscript,
  userId,
  languageCode,
  languageProbability,
}) {
  const normalizedUserId = Number(userId);
  const value = extractValue(field, englishTranscript);
  const record = {
    id: randomUUID(),
    userId: Number.isSafeInteger(normalizedUserId) && normalizedUserId > 0 ? normalizedUserId : null,
    field,
    value,
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
  // The transcript is returned for immediate UI feedback only. It is deliberately
  // not written to disk: voice-responses.json contains extracted profile values.
  return {
    ...record,
    transcript: transcript.trim(),
    englishTranscript: englishTranscript.trim(),
  };
}
