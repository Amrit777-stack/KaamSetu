import { Router } from "express";
import { requireWorker } from "../middleware/requireWorker.js";
import { reverseLocation, routeToJob } from "../controllers/locationController.js";

const locationRouter = Router();
locationRouter.get("/reverse", requireWorker, reverseLocation);
locationRouter.get("/route", requireWorker, routeToJob);

export default locationRouter;
