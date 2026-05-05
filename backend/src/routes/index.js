import { Router } from "express";
import tvcRoutes from "./tvcRoutes.js";
import predictRoutes from "./predictRoutes.js";

const router = Router();

router.use("/tvc", tvcRoutes);
router.use("/predict", predictRoutes);

export default router;
