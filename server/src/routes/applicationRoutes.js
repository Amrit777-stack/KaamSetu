import { Router } from "express";
import {
  applyApplication,
  getApplications,
  hireApplication,
  revokeApplication,
  rejectApplication,
  withdrawApp,
  resetApplications,
} from "../controllers/applicationController.js";

const applicationRouter = Router();

applicationRouter.get("/", getApplications);
applicationRouter.post("/apply", applyApplication);
applicationRouter.post("/reset", resetApplications);
applicationRouter.post("/:id/hire", hireApplication);
applicationRouter.post("/:id/revoke", revokeApplication);
applicationRouter.post("/:id/reject", rejectApplication);
applicationRouter.post("/:id/withdraw", withdrawApp);

export default applicationRouter;
