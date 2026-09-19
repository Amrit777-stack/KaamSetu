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

export const defaultTranslations = {
  "hi-IN": {
    "Hello! What is your name?": "नमस्ते! आपका नाम क्या है?",
    "What kind of work do you do?": "आप किस तरह का काम करते हैं?",
    "How much experience do you have?": "आपको इस काम का कितना अनुभव है?",
  },
  "en-IN": {
    "Hello! What is your name?": "Hello! What is your name?",
    "What kind of work do you do?": "What kind of work do you do?",
    "How much experience do you have?": "How much experience do you have?",
  },
  "ta-IN": {
    "Hello! What is your name?": "வணக்கம்! உங்கள் பெயர் என்ன?",
    "What kind of work do you do?": "நீங்கள் என்ன வேலை செய்கிறீர்கள்?",
    "How much experience do you have?": "உங்களுக்கு எவ்வளவு அனுபவம் உள்ளது?",
  },
  "te-IN": {
    "Hello! What is your name?": "నమస్కారం! మీ పేరు ఏమిటి?",
    "What kind of work do you do?": "మీరు ఎలాంటి పని చేస్తారు?",
    "How much experience do you have?": "మీకు ఎంత అనుభవం ఉంది?",
  },
  "kn-IN": {
    "Hello! What is your name?": "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಹೆಸರೇನು?",
    "What kind of work do you do?": "ನೀವು ಯಾವ ರೀತಿಯ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ?",
    "How much experience do you have?": "ನಿಮಗೆ ಎಷ್ಟು ಅನುಭವವಿದೆ?",
  },
  "mr-IN": {
    "Hello! What is your name?": "नमस्ते! तुमचे नाव काय आहे?",
    "What kind of work do you do?": "तुम्ही कोणत्या प्रकारचे काम करता?",
    "How much experience do you have?": "तुम्हाला किती कामाचा अनुभव आहे?",
  },
};

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

  if (defaultTranslations[targetLanguageCode]?.[text]) {
    const defaultText = defaultTranslations[targetLanguageCode][text];
    cache.set(key, defaultText);
    saveCache(cache).catch(() => undefined);
    return { translatedText: defaultText, cached: true };
  }

  if (sourceLanguageCode === targetLanguageCode) {
    return { translatedText: text, cached: true };
  }

  if (inFlightTranslations.has(key)) {
    return inFlightTranslations.get(key);
  }

  const translationPromise = (async () => {
    let translatedText;
    if (process.env.SARVAM_API_KEY) {
      try {
        const response = await client.text.translate({
          input: text,
          source_language_code: sourceLanguageCode,
          target_language_code: targetLanguageCode,
          model: "mayura:v1",
          mode: "formal",
          output_script: "fully-native",
        });
        translatedText = response?.translated_text;
      } catch (err) {
        console.warn("Sarvam translation call failed:", err.message);
      }
    }

    if (!translatedText) {
      translatedText = defaultTranslations[targetLanguageCode]?.[text] || text;
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
