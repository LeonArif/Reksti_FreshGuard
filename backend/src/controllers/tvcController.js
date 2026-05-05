import { z } from "zod";
import { supabase } from "../db/supabaseClient.js";

const tvcSchema = z.object({
  mq_135: z.number(),
  mq_136: z.number(),
  temperature: z.number(),
  humidity: z.number(),
  tvc: z.number(),
  rsl_minutes: z.number(),
  class: z.number().int().min(0).max(2),
  h2s: z.number().optional(),
  voc: z.number().optional(),
  amonia: z.number().optional()
});

export const listTvcSamples = async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const { data, error } = await supabase
    .from("tvc_samples")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) ? limit : 50);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ data });
};

export const createTvcSample = async (req, res) => {
  const parseResult = tvcSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten() });
  }

  const { data, error } = await supabase
    .from("tvc_samples")
    .insert(parseResult.data)
    .select("*");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ data: data?.[0] ?? null });
};
