import { translateText } from "./questionSpeech";

export const uiCopy = {
  findWork: "Find work",
  hiring: "I’m hiring",
  lookingForWork: "I’m looking for work",
  speakAndListen: "Speak & Listen",
  writeAndSelect: "Write & Select",
  continue: "Continue",
  employerAccess: "Explore employer access",
  seeMatches: "See your matches",
};

const memoryCache = new Map();

export async function getUiTranslations(languageCode) {
  if (languageCode === "en-IN") return uiCopy;
  if (memoryCache.has(languageCode)) return memoryCache.get(languageCode);

  const translatedEntries = await Promise.all(
    Object.entries(uiCopy).map(async ([key, text]) => [key, await translateText(text, languageCode)]),
  );
  const translations = Object.fromEntries(translatedEntries);
  memoryCache.set(languageCode, translations);
  return translations;
}
