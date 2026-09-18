import "dotenv/config";
import cors from "cors";
import express from "express";
import { isDatabaseConfigured } from "./config/db.js";
import { notFound } from "./middleware/notFound.js";
import employerRouter from "./routes/employerRoutes.js";
import jobRouter from "./routes/jobRoutes.js";
import workerRouter from "./routes/workerRoutes.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "KaamSetu API",
    databaseConfigured: isDatabaseConfigured(),
  });
});

app.use("/api/workers", workerRouter);
app.use("/api/employers", employerRouter);
app.use("/api/jobs", jobRouter);
app.use(notFound);

app.listen(port, () => {
  console.log(`KaamSetu API listening on http://localhost:${port}`);
});
