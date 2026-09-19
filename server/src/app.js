import "dotenv/config";
import cors from "cors";
import express from "express";
import { isDatabaseConfigured, testDatabaseConnection } from "./config/db.js";
import { notFound } from "./middleware/notFound.js";

import employerRouter from "./routes/employerRoutes.js";
import jobRouter from "./routes/jobRoutes.js";
import workerRouter from "./routes/workerRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import authRouter from "./routes/authRoutes.js";
import locationRouter from "./routes/locationRoutes.js";

import ttsRouter from "./routes/tts.js";
import translateRouter from "./routes/translate.js";
import sttRouter from "./routes/stt.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_request, response) => {
  const database = await testDatabaseConnection();

  response.json({
    status: "ok",
    service: "KaamSetu API",
    databaseConfigured: isDatabaseConfigured(),
    database,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/location", locationRouter);
app.use("/api/workers", workerRouter);
app.use("/api/employers", employerRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/applications", applicationRouter);

app.use("/api/tts", ttsRouter);
app.use("/api/translate", translateRouter);
app.use("/api/stt", sttRouter);

app.use(notFound);

export default app;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`KaamSetu API listening on http://localhost:${port}`);
  });
}
