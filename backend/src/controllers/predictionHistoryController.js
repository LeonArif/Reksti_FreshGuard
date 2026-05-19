import { resolveAuthenticatedUser } from "../lib/auth.js";
import { getLatestPrediction, listPredictionHistory } from "../lib/predictionStore.js";

export const getLatestPredictionForUser = async (req, res) => {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = await getLatestPrediction({ userId: user.id });
    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const listHistoryForUser = async (req, res) => {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = Number(req.query.limit ?? 50);
    const data = await listPredictionHistory({ userId: user.id, limit });
    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
