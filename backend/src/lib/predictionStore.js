import { supabase } from "../db/supabaseClient.js";

const historySelect = [
  "id",
  "user_id",
  "source",
  "mq_135",
  "mq_136",
  "temperature",
  "humidity",
  "h2s",
  "voc",
  "amonia",
  "tvc",
  "rsl_minutes",
  "class",
  "class_name",
  "class_probabilities",
  "created_at"
].join(", ");

const normalizeHistoryRecord = (record) => {
  if (!record) {
    return record;
  }

  return {
    ...record,
    class: record.class === null || record.class === undefined ? record.class : Number(record.class),
    class_probabilities: record.class_probabilities ?? {}
  };
};

export const savePredictionHistory = async ({ userId, source = "device", record, prediction }) => {
  if (!userId) {
    return null;
  }

  const payload = {
    user_id: userId,
    source,
    mq_135: record.mq_135,
    mq_136: record.mq_136,
    temperature: record.temperature,
    humidity: record.humidity,
    h2s: record.h2s ?? null,
    voc: record.voc ?? null,
    amonia: record.amonia ?? null,
    tvc: record.tvc,
    rsl_minutes: record.rsl_minutes,
    class: prediction.class,
    class_name: prediction.class_name,
    class_probabilities: prediction.class_probabilities ?? {}
  };

  const { data, error } = await supabase.from("prediction_history").insert(payload).select(historySelect).single();
  if (error) {
    throw new Error(error.message);
  }

  return normalizeHistoryRecord(data);
};

export const listPredictionHistory = async ({ userId, limit = 50 }) => {
  if (!userId) {
    return [];
  }

  const safeLimit = Number.isFinite(limit) ? limit : 50;
  const { data, error } = await supabase
    .from("prediction_history")
    .select(historySelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data.map(normalizeHistoryRecord) : [];
};

export const getLatestPrediction = async ({ userId }) => {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("prediction_history")
    .select(historySelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeHistoryRecord(data);
};
