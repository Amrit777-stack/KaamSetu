import { Router } from "express";
import { listJobs } from "../controllers/jobController.js";

const jobRouter = Router();
jobRouter.get("/", listJobs);

export default jobRouter;
