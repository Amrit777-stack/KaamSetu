import { useEffect, useState } from "react";
import { translateText } from "./questionSpeech.js";

// Complements the server translation cache with a browser cache so repeated
// job cards and language re-renders share the same request and result.
const titleCache = new Map();
const inFlightTitles = new Map();

function fallbackTitle(title) {
  return typeof title === "string" && title.trim() ? title : "Job opportunity";
}

export async function getTranslatedJobTitle(title, languageCode) {
  const originalTitle = fallbackTitle(title);
  if (!languageCode || languageCode === "en-IN") return originalTitle;

  const key = `${languageCode}\u0000${originalTitle}`;
  if (titleCache.has(key)) return titleCache.get(key);
  if (inFlightTitles.has(key)) return inFlightTitles.get(key);

  const request = translateText(originalTitle, languageCode)
    .then((translated) => (typeof translated === "string" && translated.trim() ? translated : originalTitle))
    .catch(() => originalTitle)
    .then((translated) => {
      titleCache.set(key, translated);
      return translated;
    })
    .finally(() => inFlightTitles.delete(key));

  inFlightTitles.set(key, request);
  return request;
}

export function useTranslatedJobTitle(title, languageCode) {
  const originalTitle = fallbackTitle(title);
  const [translatedTitle, setTranslatedTitle] = useState(originalTitle);

  useEffect(() => {
    let active = true;
    getTranslatedJobTitle(originalTitle, languageCode).then((value) => {
      if (active) setTranslatedTitle(value);
    });
    return () => { active = false; };
  }, [originalTitle, languageCode]);

  return translatedTitle;
}

// Exported for isolated tests without exposing cache state to application code.
export function clearJobTitleTranslationCache() {
  titleCache.clear();
  inFlightTitles.clear();
}
