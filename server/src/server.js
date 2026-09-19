import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import ttsRouter from "./routes/tts.js";
import translateRouter from "./routes/translate.js";
import sttRouter from "./routes/stt.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("KaamSetu backend is running!");
});

app.use("/api/tts", ttsRouter);
app.use("/api/translate", translateRouter);
app.use("/api/stt", sttRouter);

app.listen(4000, () => {
  console.log("Server running on port 4000");
});
