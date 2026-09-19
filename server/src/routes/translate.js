import express from "express";
import { translateText } from "../services/translationService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      text,
      sourceLanguageCode = "en-IN",
      targetLanguageCode,
    } = req.body;

    if (!text || !targetLanguageCode) {
      return res.status(400).json({
        error: "text and targetLanguageCode are required",
      });
    }

    const { translatedText, cached } = await translateText({
      text,
      sourceLanguageCode,
      targetLanguageCode,
    });

    res.json({
      sourceText: text,
      sourceLanguageCode,
      targetLanguageCode,
      translatedText,
      cached,
    });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

export default router;
