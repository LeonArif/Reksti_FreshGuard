import { Router } from "express";
import { createTvcSample, listTvcSamples } from "../controllers/tvcController.js";

const router = Router();

router.get("/", listTvcSamples);
router.post("/", createTvcSample);

export default router;
