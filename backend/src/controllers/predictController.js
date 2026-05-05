import { z } from "zod";
import { supabase } from "../db/supabaseClient.js";

const classProbabilitiesSchema = z.object({
  Safe: z.number(),
  Warning: z.number(),
  Danger: z.number()
});

const currentPredictSchema = z.object({
  mq_135: z.number(),
  mq_136: z.number(),
  temperature: z.number(),
  humidity: z.number(),
  class: z.number().int().min(0).max(2),
  class_name: z.enum(["Safe", "Warning", "Danger"]),
  class_probabilities: classProbabilitiesSchema,
  rsl_minutes: z.number(),
  tvc_sample_id: z.string().uuid().optional()
});

const legacyPredictSchema = z.object({
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

const predictSchema = z.union([currentPredictSchema, legacyPredictSchema]).transform((value) => {
  if ("class_probabilities" in value) {
    return {
      mq_135: value.mq_135,
      mq_136: value.mq_136,
      temperature: value.temperature,
      humidity: value.humidity,
      freshness_label: value.class_name,
      rsl_minutes: value.rsl_minutes,
      prob_safe: value.class_probabilities.Safe,
      prob_warning: value.class_probabilities.Warning,
      prob_danger: value.class_probabilities.Danger,
      tvc_sample_id: value.tvc_sample_id
    };
  }

  return value;
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
    .select("*");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ data: data?.[0] ?? null });
};
