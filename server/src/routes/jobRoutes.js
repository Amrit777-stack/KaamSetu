import { Router } from "express";
import { listJobs, listNearbyJobs, postJob, updateJob, removeJob } from "../controllers/jobController.js";
import { requireWorker } from "../middleware/requireWorker.js";

const jobRouter = Router();

jobRouter.get("/", listJobs);
jobRouter.get("/nearby", requireWorker, listNearbyJobs);
jobRouter.post("/", postJob);
jobRouter.patch("/:id", updateJob);
jobRouter.put("/:id", updateJob);
jobRouter.delete("/:id", removeJob);

export default jobRouter;
