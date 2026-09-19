import express from "express";
import { SarvamAIClient } from "sarvamai";
import { saveVoiceResponse } from "../services/voiceResponseService.js";

const router = express.Router();
const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});
const acceptedFields = new Set(["name", "occupation", "experienceYears"]);

function getProviderErrorMessage(error) {
  const body = error?.body;
  const message =
    typeof body === "string"
      ? body
      : body?.message || body?.detail || body?.error?.message || body?.error;
  return typeof message === "string" ? message.replace(/\s+/g, " ").trim() : "";
}

function getAudioFileMetadata(contentTypeHeader) {
  const contentType = (contentTypeHeader || "audio/webm").split(";", 1)[0].trim().toLowerCase();
  const extensionByType = {
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/x-m4a": "m4a",
    "audio/x-wav": "wav",
  };

  return { contentType, extension: extensionByType[contentType] || "webm" };
}

router.post("/", express.raw({ type: "audio/*", limit: "10mb" }), async (req, res) => {
  try {
    const { field } = req.query;

    if (!acceptedFields.has(field)) {
      return res.status(400).json({ error: "A valid field is required" });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "An audio recording is required" });
    }

    if (!process.env.SARVAM_API_KEY) {
      console.error("STT is unavailable: SARVAM_API_KEY is not configured");
      return res.status(503).json({
        error: "Speech recognition is not configured. Add SARVAM_API_KEY to server/.env and restart the backend.",
      });
    }

    const { contentType, extension } = getAudioFileMetadata(req.get("content-type"));
    const audioFile = {
      data: req.body,
      filename: `recording.${extension}`,
      contentType,
    };
    const [nativeResponse, englishResponse] = await Promise.all([
      client.speechToText.transcribe({
        file: audioFile,
        // Keeps the recognised text in the language and script that was spoken.
        model: "saaras:v3",
        mode: "transcribe",
        language_code: "unknown",
      }),
      client.speechToText.transcribe({
        file: audioFile,
        // The English text is retained for extracting structured values in storage.
        model: "saaras:v3",
        mode: "translate",
        language_code: "unknown",
      }),
    ]);

    if (!nativeResponse.transcript?.trim() || !englishResponse.transcript?.trim()) {
      throw new Error("Sarvam returned an incomplete transcript");
    }

    const record = await saveVoiceResponse({
      field,
      transcript: nativeResponse.transcript,
      englishTranscript: englishResponse.transcript,
      languageCode: nativeResponse.language_code,
      languageProbability: nativeResponse.language_probability,
    });

    res.status(201).json({ record });
  } catch (error) {
    console.error("STT error:", error);
    const statusCode = error?.statusCode;
    const providerMessage = getProviderErrorMessage(error);
    if (statusCode === 400 || statusCode === 422) {
      return res.status(400).json({
        error: providerMessage || "The recording could not be read. Please record a short answer and try again.",
      });
    }
    if (statusCode === 403) {
      return res.status(503).json({
        error: "Speech recognition is unavailable because the Sarvam API key is invalid or inactive.",
      });
    }
    if (statusCode === 429) {
      return res.status(429).json({
        error: "Speech recognition is busy. Please wait a moment and try again.",
      });
    }
    res.status(502).json({ error: "Speech recognition is temporarily unavailable. Please try again." });
  }
});

export default router;
