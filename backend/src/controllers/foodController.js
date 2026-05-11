import { z } from "zod";
import { supabase } from "../db/supabaseClient.js";
import { runPython } from "./inferenceController.js";

let uploadRequestedAt = null;
let pendingPredictResolve = null;
let pendingPredictTimer   = null;

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
  z.number().nullable().optional()
);

const ingestSchema = z.object({
  mq_135: z.coerce.number(),
  mq_136: z.coerce.number().default(5.0),
  temperature: z.coerce.number(),
  humidity: z.coerce.number(),
  h2s: optionalNumber,
  voc: optionalNumber,
  amonia: optionalNumber
});

const normalizeFoodRecord = (record) => {
  if (!record) {
    return record;
  }

  return {
    ...record,
    class: record.class === null || record.class === undefined ? record.class : Number(record.class) - 1
  };
};

export const listFoodRecords = async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const { data, error } = await supabase
    .from("kondisi_makanan")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 50);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ data: Array.isArray(data) ? data.map(normalizeFoodRecord) : data });
};

export const createFoodRecord = async (req, res) => {
  const parseResult = ingestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten() });
  }

  const payload = parseResult.data;
  const record = {
    mq_135: payload.mq_135,
    mq_136: payload.mq_136,
    temperature: payload.temperature,
    humidity: payload.humidity,
    h2s: payload.h2s ?? null,
    voc: payload.voc ?? null,
    amonia: payload.amonia ?? null,
    tvc: 0.0,
    rsl_minutes: 0.0,
    class: 1
  };

  const { data, error } = await supabase
    .from("kondisi_makanan")
    .insert(record)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  let updatedRecord = data;

  try {
    const result = await runPython({
      mq135: payload.mq_135,
      mq136: payload.mq_136,
      temperature: payload.temperature,
      humidity: payload.humidity
    });

    if (result?.ok) {
      const { data: prediction, error: updateError } = await supabase
        .from("kondisi_makanan")
        .update({
          tvc: result.data.tvc ?? result.data.class,
          rsl_minutes: result.data.rsl_minutes,
          class: result.data.class + 1
        })
        .eq("id", data.id)
        .select("*")
        .single();

      if (!updateError && prediction) {
        updatedRecord = prediction;
      }
    }
  } catch (error) {
    // Prediction is best-effort to keep ingestion fast.
  }

  // Resolve any frontend long-poll waiting for this result
  if (pendingPredictResolve) {
    const resolve = pendingPredictResolve;
    pendingPredictResolve = null;
    clearTimeout(pendingPredictTimer);
    pendingPredictTimer = null;
    resolve(normalizeFoodRecord(updatedRecord));
  }

  return res.status(201).json({ data: normalizeFoodRecord(updatedRecord) });
};

export const requestDeviceUpload = async (_req, res) => {
  uploadRequestedAt = new Date();
  return res.json({ ok: true, requested_at: uploadRequestedAt.toISOString() });
};

// POST /api/food/predict
// Sets upload flag then long-polls up to 15 s for ESP32 to deliver sensor data.
// Returns the complete prediction record once received, or 504 on timeout.
export const predictWithDevice = async (_req, res) => {
  // Cancel any previous pending request
  if (pendingPredictTimer) {
    clearTimeout(pendingPredictTimer);
    pendingPredictTimer = null;
  }
  if (pendingPredictResolve) {
    pendingPredictResolve(null);
    pendingPredictResolve = null;
  }

  uploadRequestedAt = new Date();

  const record = await new Promise((resolve) => {
    pendingPredictResolve = resolve;
    pendingPredictTimer = setTimeout(() => {
      pendingPredictResolve = null;
      pendingPredictTimer   = null;
      resolve(null);
    }, 15000);
  });

  if (!record) {
    return res.status(504).json({ success: false, error: "ESP32 tidak merespons dalam 15 detik. Pastikan perangkat menyala dan terhubung Wi-Fi." });
  }

  return res.json({ success: true, data: record });
};

export const getDeviceCommand = async (_req, res) => {
  if (!uploadRequestedAt) {
    return res.json({ upload_now: false });
  }

  const requestedAt = uploadRequestedAt.toISOString();
  uploadRequestedAt = null;
  return res.json({ upload_now: true, requested_at: requestedAt });
};
