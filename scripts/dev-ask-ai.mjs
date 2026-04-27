import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import handler from "../netlify/functions/ask-ai.mjs";

const PORT = Number(process.env.ASK_AI_PORT || 9999);

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[ask-ai dev] ANTHROPIC_API_KEY is not set. Add it to .env.local in the project root."
  );
}

createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf-8");

  const url = `http://localhost:${PORT}${req.url}`;
  const webReq = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.method === "POST" ? body : undefined,
  });

  try {
    const response = await handler(webReq);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  } catch (err) {
    console.error("[ask-ai dev] handler crashed", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Local dev server crashed." }));
  }
}).listen(PORT, () => {
  console.log(`[ask-ai dev] listening on http://localhost:${PORT}`);
  console.log(`[ask-ai dev] POST http://localhost:${PORT}/ask-ai with { "question": "..." }`);
});

function loadEnvFile(name) {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, "..", name);
  let raw;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
