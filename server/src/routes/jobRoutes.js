import { Router } from "express";
import { listJobs, postJob } from "../controllers/jobController.js";

const jobRouter = Router();

jobRouter.get("/", listJobs);
jobRouter.post("/", postJob);

export default jobRouter;
