import { useEffect, useState } from "react";
import { translateText } from "./questionSpeech.js";

// Complements the server translation cache with a browser cache so repeated
// job cards and language re-renders share the same request and result.
const titleCache = new Map();
const inFlightTitles = new Map();
const descriptionCache = new Map();
const inFlightDescriptions = new Map();

function fallbackTitle(title) {
  return typeof title === "string" && title.trim() ? title : "Job opportunity";
}

function fallbackDescription(description) {
  return typeof description === "string" && description.trim() ? description : "";
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
  const cacheKey = `${languageCode}\u0000${originalTitle}`;
  const [translatedTitle, setTranslatedTitle] = useState(
    !languageCode || languageCode === "en-IN"
      ? originalTitle
      : titleCache.get(cacheKey) || originalTitle
  );

  useEffect(() => {
    if (!languageCode || languageCode === "en-IN") return;
    let active = true;
    getTranslatedJobTitle(originalTitle, languageCode).then((value) => {
      if (active) setTranslatedTitle(value);
    });
    return () => { active = false; };
  }, [originalTitle, languageCode]);

  return !languageCode || languageCode === "en-IN" ? originalTitle : translatedTitle;
}

export async function getTranslatedJobDescription(description, languageCode) {
  const originalDesc = fallbackDescription(description);
  if (!originalDesc || !languageCode || languageCode === "en-IN") return originalDesc;

  const key = `${languageCode}\u0000${originalDesc}`;
  if (descriptionCache.has(key)) return descriptionCache.get(key);
  if (inFlightDescriptions.has(key)) return inFlightDescriptions.get(key);

  const request = translateText(originalDesc, languageCode)
    .then((translated) => (typeof translated === "string" && translated.trim() ? translated : originalDesc))
    .catch(() => originalDesc)
    .then((translated) => {
      descriptionCache.set(key, translated);
      return translated;
    })
    .finally(() => inFlightDescriptions.delete(key));

  inFlightDescriptions.set(key, request);
  return request;
}

export function useTranslatedJobDescription(description, languageCode) {
  const originalDesc = fallbackDescription(description);
  const cacheKey = `${languageCode}\u0000${originalDesc}`;
  const [translatedDesc, setTranslatedDesc] = useState(
    !languageCode || languageCode === "en-IN"
      ? originalDesc
      : descriptionCache.get(cacheKey) || originalDesc
  );

  useEffect(() => {
    if (!languageCode || languageCode === "en-IN") return;
    let active = true;
    getTranslatedJobDescription(originalDesc, languageCode).then((value) => {
      if (active) setTranslatedDesc(value);
    });
    return () => { active = false; };
  }, [originalDesc, languageCode]);

  return !languageCode || languageCode === "en-IN" ? originalDesc : translatedDesc;
}

// Exported for isolated tests without exposing cache state to application code.
export function clearJobTitleTranslationCache() {
  titleCache.clear();
  inFlightTitles.clear();
  descriptionCache.clear();
  inFlightDescriptions.clear();
}

