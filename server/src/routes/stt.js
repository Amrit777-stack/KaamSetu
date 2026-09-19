import express from "express";
import { SarvamAIClient } from "sarvamai";
import { saveVoiceResponse } from "../services/voiceResponseService.js";

const router = express.Router();
const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});
const acceptedFields = new Set(["name", "occupation", "experienceYears"]);

router.post("/", express.raw({ type: "audio/*", limit: "10mb" }), async (req, res) => {
  try {
    const { field } = req.query;

    if (!acceptedFields.has(field)) {
      return res.status(400).json({ error: "A valid field is required" });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "An audio recording is required" });
    }

    const contentType = req.get("content-type") || "audio/webm";
    const extension = contentType.includes("ogg") ? "ogg" : contentType.includes("wav") ? "wav" : "webm";
    const response = await client.speechToText.transcribe({
      file: {
        data: req.body,
        filename: `recording.${extension}`,
        contentType,
      },
      model: "saaras:v4",
      mode: "translate",
    });

    if (!response.transcript?.trim()) {
      throw new Error("Sarvam returned no English transcript");
    }

    const record = await saveVoiceResponse({
      field,
      transcript: response.transcript,
      languageCode: response.language_code,
      languageProbability: response.language_probability,
    });

    res.status(201).json({ record });
  } catch (error) {
    console.error("STT error:", error);
    res.status(500).json({ error: "Failed to transcribe the recording" });
  }
});

export default router;
