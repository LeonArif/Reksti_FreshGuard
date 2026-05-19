import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import foodRoutes from "./routes/foodRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import { supabase } from "./db/supabaseClient.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const allowedOrigins = new Set(
  // [process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? "http://localhost:5173"]
  [process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? "http://localhost:5173"]
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
);

const isLocalDevOrigin = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);
    return (protocol === "http:" || protocol === "https:") && (hostname === "localhost" || hostname === "127.0.0.1");
  } catch (_error) {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has("*") || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
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
app.use("/api/predictions", predictionRoutes);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${port}`);
});
