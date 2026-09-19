import { Router } from "express";
import { listWorkers, getProfile, saveProfile } from "../controllers/workerController.js";

const workerRouter = Router();
workerRouter.get("/", listWorkers);
workerRouter.post("/profile", saveProfile);
workerRouter.get("/:userId", getProfile);

export default workerRouter;
