import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import foodRoutes from "./routes/foodRoutes.js";
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
  const { error } = await supabase.from("kondisi_makanan").select("id", { head: true, count: "exact" });
  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true });
});

app.use("/api/food", foodRoutes);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${port}`);
});
