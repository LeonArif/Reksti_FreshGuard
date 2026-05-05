import { Router } from "express";
import { listFoodRecords } from "../controllers/foodController.js";
import { runManualPrediction } from "../controllers/inferenceController.js";

const router = Router();

router.get("/", listFoodRecords);
router.post("/manual", runManualPrediction);

export default router;
