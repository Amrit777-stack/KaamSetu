import { Router } from "express";
import { listWorkers } from "../controllers/workerController.js";

const workerRouter = Router();
workerRouter.get("/", listWorkers);

export default workerRouter;
