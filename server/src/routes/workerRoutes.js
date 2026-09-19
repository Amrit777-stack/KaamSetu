import { Router } from "express";
import { listWorkers, getProfile, saveProfile, saveLocation, saveManualLocation } from "../controllers/workerController.js";
import { requireWorker } from "../middleware/requireWorker.js";

const workerRouter = Router();
workerRouter.get("/", listWorkers);
workerRouter.post("/profile", saveProfile);
workerRouter.post("/location", requireWorker, saveLocation);
workerRouter.post("/location/manual", requireWorker, saveManualLocation);
workerRouter.get("/:userId", getProfile);

export default workerRouter;
