import { Router } from "express";
import {
	createFoodRecord,
	getDeviceCommand,
	listFoodRecords,
	predictWithDevice,
	requestDeviceUpload
} from "../controllers/foodController.js";
import { runManualPrediction } from "../controllers/inferenceController.js";

const router = Router();

router.get("/", listFoodRecords);
router.post("/ingest", createFoodRecord);
router.post("/predict", predictWithDevice);
router.post("/request-upload", requestDeviceUpload);
router.get("/command", getDeviceCommand);
router.post("/manual", runManualPrediction);

export default router;
