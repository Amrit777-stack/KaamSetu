import express from "express";
import { SarvamAIClient } from "sarvamai";

const router = express.Router();

const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { text, languageCode } = req.body;

    if (!text || !languageCode) {
      return res.status(400).json({
        error: "text and languageCode are required",
      });
    }

    const response = await client.textToSpeech.convert({
      text,
      model: "bulbul:v3",
      language_code: languageCode,
      speaker: "shubh",
      speech_sample_rate: 24000,
      output_audio_codec: "wav",
    });

    if (!response.audios?.[0]) {
      throw new Error("Sarvam returned no audio data");
    }

    res.json({ audio: response.audios[0] });
  } catch (error) {
    console.error("TTS error:", error);

    res.status(500).json({
      error: "Failed to generate speech",
    });
  }
});

export default router;
