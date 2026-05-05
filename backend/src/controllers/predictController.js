import { z } from "zod";
import { supabase } from "../db/supabaseClient.js";

const predictSchema = z.object({
  mq_135: z.number(),
  mq_136: z.number(),
  temperature: z.number(),
  humidity: z.number(),
  freshness_label: z.enum(["Safe", "Warning", "Danger"]),
  rsl_minutes: z.number(),
  prob_safe: z.number(),
  prob_warning: z.number(),
  prob_danger: z.number(),
  tvc_sample_id: z.string().uuid().optional()
});

export const listPredictSamples = async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const { data, error } = await supabase
    .from("predict_samples")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 50);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ data });
};

export const createPredictSample = async (req, res) => {
  const parseResult = predictSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten() });
  }

  const { data, error } = await supabase
    .from("predict_samples")
    .insert(parseResult.data)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ data });
};
