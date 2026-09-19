import { Router } from "express";
import { listJobs, postJob, updateJob, removeJob } from "../controllers/jobController.js";

const jobRouter = Router();

jobRouter.get("/", listJobs);
jobRouter.post("/", postJob);
jobRouter.patch("/:id", updateJob);
jobRouter.put("/:id", updateJob);
jobRouter.delete("/:id", removeJob);

export default jobRouter;
