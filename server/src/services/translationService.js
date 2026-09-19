import { SarvamAIClient } from "sarvamai";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const cacheDirectory = path.resolve(serviceDirectory, "../../data");
const cachePath = path.join(cacheDirectory, "translation-cache.json");
let cachePromise;
let cacheWritePromise = Promise.resolve();
const inFlightTranslations = new Map();

async function loadCache() {
  if (!cachePromise) {
    cachePromise = (async () => {
      await mkdir(cacheDirectory, { recursive: true });
      try {
        return new Map(Object.entries(JSON.parse(await readFile(cachePath, "utf8"))));
      } catch (error) {
        if (error.code === "ENOENT") return new Map();
        throw error;
      }
    })();
  }

  return cachePromise;
}

function saveCache(cache) {
  cacheWritePromise = cacheWritePromise.catch(() => undefined).then(async () => {
    const temporaryCachePath = `${cachePath}.tmp`;
    await writeFile(
      temporaryCachePath,
      `${JSON.stringify(Object.fromEntries(cache), null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryCachePath, cachePath);
  });
  return cacheWritePromise;
}

export async function translateText({
  text,
  sourceLanguageCode = "en-IN",
  targetLanguageCode,
}) {
  const key = JSON.stringify([sourceLanguageCode, targetLanguageCode, text]);
  const cache = await loadCache();
  const cachedTranslation = cache.get(key);

  if (cachedTranslation) {
    return { translatedText: cachedTranslation, cached: true };
  }

  if (inFlightTranslations.has(key)) {
    return inFlightTranslations.get(key);
  }

  const translationPromise = (async () => {
    const translatedText = sourceLanguageCode === targetLanguageCode
      ? text
      : (await client.text.translate({
        input: text,
        source_language_code: sourceLanguageCode,
        target_language_code: targetLanguageCode,
        model: "mayura:v1",
        // Questions should be fully translated, not returned as code-mixed speech.
        mode: "formal",
        output_script: "fully-native",
      })).translated_text;

    if (!translatedText) {
      throw new Error("Sarvam returned no translated text");
    }

    cache.set(key, translatedText);
    await saveCache(cache);
    return { translatedText, cached: false };
  })();

  inFlightTranslations.set(key, translationPromise);
  try {
    return await translationPromise;
  } finally {
    inFlightTranslations.delete(key);
  }
}
