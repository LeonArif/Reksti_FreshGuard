import { Router } from "express";
import { getLatestPredictionForUser, listHistoryForUser } from "../controllers/predictionHistoryController.js";

const router = Router();

router.get("/latest", getLatestPredictionForUser);
router.get("/history", listHistoryForUser);

export default router;
