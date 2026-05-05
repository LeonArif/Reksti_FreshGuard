import { Router } from "express";
import { createPredictSample, listPredictSamples } from "../controllers/predictController.js";
import { runManualPrediction } from "../controllers/inferenceController.js";

const router = Router();

router.get("/", listPredictSamples);
router.post("/", createPredictSample);
router.post("/manual", runManualPrediction);

export default router;
