const API_BASE_URL = "http://localhost:4000/api";

export const questionTranslations = {
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

export function getFallbackQuestion(text, languageCode) {
  if (!languageCode || languageCode === "en-IN") return text;
  return questionTranslations[languageCode]?.[text] || null;
}

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
  if (!preferredLanguageCode || preferredLanguageCode === "en-IN") {
    return text;
  }

  const fallback = getFallbackQuestion(text, preferredLanguageCode);

  try {
    const translation = await requestJson("/translate", {
      text,
      sourceLanguageCode: "en-IN",
      targetLanguageCode: preferredLanguageCode,
    });

    if (translation?.translatedText) {
      return translation.translatedText;
    }
  } catch (error) {
    console.warn("Translation request failed, using local translation:", error);
  }

  return fallback || text;
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
  try {
    const tts = await requestJson("/tts", {
      text,
      languageCode,
    });

    if (tts?.audio) {
      const audio = new Audio(`data:audio/wav;base64,${tts.audio}`);
      return await audio.play();
    }
  } catch (error) {
    console.warn("Backend TTS failed, using browser speech synthesis:", error);
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (languageCode) utterance.lang = languageCode;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  throw new Error("The TTS service returned no audio.");
}

// Questions are authored in English and translated before TTS is requested.
export async function speakQuestion(question, preferredLanguageCode) {
  const translatedText = await translateQuestion(question, preferredLanguageCode);
  await speakText(translatedText, preferredLanguageCode);
  return translatedText;
}
