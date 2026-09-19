const API_BASE_URL = "http://localhost:4000/api";

async function requestJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    throw new Error(data.error || `Voice service request failed (HTTP ${response.status})`);
  }

  return data;
}

export async function translateText(text, preferredLanguageCode) {
  const translation = await requestJson("/translate", {
    text,
    sourceLanguageCode: "en-IN",
    targetLanguageCode: preferredLanguageCode,
  });

  return translation.translatedText;
}

export const translateQuestion = translateText;

// Warm the server-side cache when a language is selected, so later questions
// do not wait for an individual translation request when their page opens.
export function prefetchQuestionTranslations(questions, preferredLanguageCode) {
  return Promise.all(
    questions.map((question) => translateQuestion(question, preferredLanguageCode)),
  );
}

export async function speakText(text, languageCode) {
  const tts = await requestJson("/tts", {
    text,
    languageCode,
  });

  if (!tts.audio) {
    throw new Error("The TTS service returned no audio.");
  }

  await new Audio(`data:audio/wav;base64,${tts.audio}`).play();
}

// Questions are authored in English and translated before TTS is requested.
export async function speakQuestion(question, preferredLanguageCode) {
  const translatedText = await translateQuestion(question, preferredLanguageCode);
  await speakText(translatedText, preferredLanguageCode);
  return translatedText;
}
