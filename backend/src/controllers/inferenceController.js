import { spawn, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { supabase } from "../db/supabaseClient.js";
import { resolveAuthenticatedUser } from "../lib/auth.js";
import { savePredictionHistory } from "../lib/predictionStore.js";

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

const normalizePredictionOutput = (resultData) => ({
  class: resultData.class,
  class_name: resultData.class_name ?? (resultData.class === 0 ? "Safe" : resultData.class === 1 ? "Warning" : "Danger"),
  class_probabilities: resultData.class_probabilities ?? {}
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, "..", "..", "ai", "predict.py");

export const runPython = async (payload) => {
  const baseCandidates = [process.env.PYTHON_PATH, process.env.PYTHON, "python", "python3", "py"].filter(Boolean);

  // Try to resolve an absolute path to python using platform tools (where/which)
  const resolved = [];
  try {
    if (process.platform === "win32") {
      const out = execSync("where python", { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
      if (out) {
        out.split(/\r?\n/).forEach((p) => resolved.push(p.trim()));
      }
    } else {
      const out = execSync("which python || which python3", { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
      if (out) {
        out.split(/\r?\n/).forEach((p) => resolved.push(p.trim()));
      }
    }
  } catch (_err) {
    // ignore resolution errors
  }

  const candidates = Array.from(new Set([...resolved, ...baseCandidates]));

  let lastError = null;

  for (const cmd of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const attempt = await new Promise((resolve) => {
      let child;
      try {
        child = spawn(cmd, [scriptPath], {
          stdio: ["pipe", "pipe", "pipe"]
        });
      } catch (spawnErr) {
        // spawn may throw synchronously on some platforms; return as error
        return resolve({ ok: false, error: spawnErr });
      }

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        return resolve({ ok: false, error });
      });

      child.on("close", (code) => {
        if (code !== 0 && stderr) {
          return resolve({ ok: false, error: new Error(stderr.trim()) });
        }

        try {
          const parsed = JSON.parse(stdout);
          return resolve({ ok: true, data: parsed });
        } catch (error) {
          return resolve({ ok: false, error });
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });

    if (attempt.ok) {
      return attempt.data;
    }

    // If spawn failed due to ENOENT, try again using the shell which helps
    // resolve Windows App Execution Aliases or PATH shims.
    if (attempt.error && attempt.error.code === "ENOENT") {
      try {
        // eslint-disable-next-line no-await-in-loop
        const shellAttempt = await new Promise((resolve) => {
          const shellChild = spawn(cmd, [scriptPath], {
            stdio: ["pipe", "pipe", "pipe"],
            shell: true
          });

          let stdout = "";
          let stderr = "";

          shellChild.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
          });

          shellChild.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
          });

          shellChild.on("error", (error) => resolve({ ok: false, error }));
          shellChild.on("close", (code) => {
            if (code !== 0 && stderr) return resolve({ ok: false, error: new Error(stderr.trim()) });
            try {
              const parsed = JSON.parse(stdout);
              return resolve({ ok: true, data: parsed });
            } catch (error) {
              return resolve({ ok: false, error });
            }
          });

          shellChild.stdin.write(JSON.stringify(payload));
          shellChild.stdin.end();
        });

        if (shellAttempt.ok) {
          return shellAttempt.data;
        }

        lastError = shellAttempt.error instanceof Error ? shellAttempt.error : new Error(String(shellAttempt.error));
        // continue to next candidate
        // eslint-disable-next-line no-empty
      } catch (_e) {}
    }

    lastError = attempt.error instanceof Error ? attempt.error : new Error(String(attempt.error));
  }

  // Log helpful debug info for server logs before throwing
  try {
    console.error("runPython: tried python candidates:", candidates);
    if (lastError) console.error("runPython: last error:", lastError && lastError.message ? lastError.message : String(lastError));
  } catch (_e) {}

  throw lastError ?? new Error("No python executable available");
};

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
    const predictionOutput = normalizePredictionOutput(result.data);
    const dbRecord = {
      ...record,
      class: record.class + 1
    };

    // Always insert a new kondisi_makanan record so duplicates with identical sensor
    // values are permitted. Prediction history is stored separately in `prediction_history`.
    const { data, error } = await supabase
      .from("kondisi_makanan")
      .insert(dbRecord)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const user = await resolveAuthenticatedUser(req).catch((resolveError) => {
      console.error("Failed to resolve authenticated user", resolveError);
      return null;
    });

    if (user?.id) {
      try {
        await savePredictionHistory({
          userId: user.id,
          source: "manual",
          record: data,
          prediction: predictionOutput
        });
      } catch (historyError) {
        console.error("Failed to save manual prediction history", historyError);
      }
    }

    return res.json({
      data: {
        ...data,
        class_name: predictionOutput.class_name,
        class_probabilities: predictionOutput.class_probabilities
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
