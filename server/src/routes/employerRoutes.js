import { Router } from "express";
import { listEmployers } from "../controllers/employerController.js";

const employerRouter = Router();
employerRouter.get("/", listEmployers);

export default employerRouter;
