import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { supabase } from "../db/supabaseClient.js";

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().optional()
);

const inputSchema = z.object({
  mq135: z.coerce.number(),
  mq136: z.coerce.number(),
  temperature: z.coerce.number(),
  humidity: z.coerce.number(),
  h2s: optionalNumber,
  voc: optionalNumber,
  amonia: optionalNumber
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, "..", "..", "ai", "predict.py");

const runPython = (payload) =>
  new Promise((resolve, reject) => {
    const pythonCmd = process.env.PYTHON_PATH || "python";
    const child = spawn(pythonCmd, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0 && stderr) {
        return reject(new Error(stderr.trim()));
      }
      try {
        const parsed = JSON.parse(stdout);
        return resolve(parsed);
      } catch (error) {
        return reject(error);
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });

export const runManualPrediction = async (req, res) => {
  const parseResult = inputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten() });
  }

  try {
    const input = parseResult.data;
    const result = await runPython({
      mq135: input.mq135,
      mq136: input.mq136,
      temperature: input.temperature,
      humidity: input.humidity
    });
    if (!result.ok) {
      return res.status(500).json({ error: result.error });
    }

    const record = {
      mq_135: input.mq135,
      mq_136: input.mq136,
      temperature: input.temperature,
      humidity: input.humidity,
      h2s: input.h2s ?? null,
      voc: input.voc ?? null,
      amonia: input.amonia ?? null,
      tvc: result.data.tvc ?? result.data.class,
      rsl_minutes: result.data.rsl_minutes,
      class: result.data.class
    };
    const dbRecord = {
      ...record,
      class: record.class + 1
    };

    let query = supabase.from("kondisi_makanan").select("*");
    const applyFilter = (builder, column, value) => {
      if (value === null || value === undefined) {
        return builder.is(column, null);
      }
      return builder.eq(column, value);
    };

    query = applyFilter(query, "mq_135", record.mq_135);
    query = applyFilter(query, "mq_136", record.mq_136);
    query = applyFilter(query, "temperature", record.temperature);
    query = applyFilter(query, "humidity", record.humidity);
    query = applyFilter(query, "h2s", record.h2s);
    query = applyFilter(query, "voc", record.voc);
    query = applyFilter(query, "amonia", record.amonia);

    const { data: existing, error: existingError } = await query.limit(1).maybeSingle();
    if (existingError) {
      return res.status(500).json({ error: existingError.message });
    }

    if (existing) {
      const { data, error } = await supabase
        .from("kondisi_makanan")
        .update({
          tvc: record.tvc,
          rsl_minutes: record.rsl_minutes,
          class: dbRecord.class
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({
        data: {
          ...data,
          class_name: result.data.class_name,
          class_probabilities: result.data.class_probabilities
        }
      });
    }

    const { data, error } = await supabase
      .from("kondisi_makanan")
      .insert(dbRecord)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      data: {
        ...data,
        class_name: result.data.class_name,
        class_probabilities: result.data.class_probabilities
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
