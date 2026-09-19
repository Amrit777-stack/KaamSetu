import { Router } from "express";
import {
  applyApplication,
  getApplications,
  hireApplication,
  resetApplications,
} from "../controllers/applicationController.js";

const applicationRouter = Router();

applicationRouter.get("/", getApplications);
applicationRouter.post("/apply", applyApplication);
applicationRouter.post("/reset", resetApplications);
applicationRouter.post("/:id/hire", hireApplication);

export default applicationRouter;
