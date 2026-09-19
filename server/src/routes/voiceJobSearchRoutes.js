import { Router } from "express";
import { continueVoiceJobSearch, startVoiceJobSearch } from "../services/voiceJobSearchService.js";

const router = Router();

router.post("/start", (request, response) => response.json(startVoiceJobSearch(request.body.language)));
router.post("/turn", async (request, response) => {
  try {
    const result = await continueVoiceJobSearch(request.body);
    response.json(result);
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message });
  }
});

export default router;
