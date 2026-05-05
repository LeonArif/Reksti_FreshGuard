import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const inputSchema = z.object({
  mq135: z.coerce.number(),
  mq136: z.coerce.number(),
  temperature: z.coerce.number(),
  humidity: z.coerce.number()
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
    const result = await runPython(parseResult.data);
    if (!result.ok) {
      return res.status(500).json({ error: result.error });
    }
    return res.json(result.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
