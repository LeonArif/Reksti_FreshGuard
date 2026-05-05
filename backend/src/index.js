import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import tvcRoutes from "./routes/tvcRoutes.js";
import predictRoutes from "./routes/predictRoutes.js";
import { supabase } from "./db/supabaseClient.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

app.get("/health", async (_req, res) => {
  const { error } = await supabase.from("tvc_samples").select("id", { head: true, count: "exact" });
  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true });
});

app.use("/api/tvc", tvcRoutes);
app.use("/api/predict", predictRoutes);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${port}`);
});
