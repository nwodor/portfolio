import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_QUESTION_CHARS = 300;
const MAX_OUTPUT_TOKENS = 500;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const BIO = loadBio();
const rateLimitBuckets = globalThis.__askAiRateLimitBuckets ?? new Map();
globalThis.__askAiRateLimitBuckets = rateLimitBuckets;

function loadBio() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), "README.md"),
    join(here, "README.md"),
    join(here, "..", "..", "README.md"),
    join(here, "..", "..", "..", "README.md"),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, "utf-8");
    } catch {
      // try next
    }
  }
  return "Bio unavailable.";
}

function buildSystemPrompt(bio) {
  return `You are the Ask-AI assistant for Success Nwodor-Joseph's personal portfolio website.

Your job is to answer questions about Success based ONLY on the bio below. Stay friendly, concise, and direct — 1 to 4 short sentences is the sweet spot.

Rules:
- If something isn't in the bio, say you don't know rather than inventing details.
- Refer to him as "Success" or "he/him".
- Don't pretend to be Success himself; you are an assistant talking *about* him.
- Keep the tone professional but warm, matching a portfolio site.
- No markdown headers in replies. Plain text or a short bullet list is fine.

=== BIO START ===
${bio}
=== BIO END ===`;
}

const SYSTEM_PROMPT = buildSystemPrompt(BIO);

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function getClientId(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return (
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("client-ip") ||
    "unknown"
  );
}

function checkRateLimit(request) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const clientId = getClientId(request);
  const recentRequests = (rateLimitBuckets.get(clientId) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((recentRequests[0] + RATE_LIMIT_WINDOW_MS - now) / 1000),
    );
    rateLimitBuckets.set(clientId, recentRequests);
    cleanupRateLimitBuckets(windowStart);
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
    };
  }

  recentRequests.push(now);
  rateLimitBuckets.set(clientId, recentRequests);
  cleanupRateLimitBuckets(windowStart);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: RATE_LIMIT_MAX_REQUESTS - recentRequests.length,
  };
}

function cleanupRateLimitBuckets(windowStart) {
  for (const [clientId, timestamps] of rateLimitBuckets.entries()) {
    const recentRequests = timestamps.filter((timestamp) => timestamp > windowStart);
    if (recentRequests.length) {
      rateLimitBuckets.set(clientId, recentRequests);
    } else {
      rateLimitBuckets.delete(clientId);
    }
  }
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return jsonResponse(
      429,
      {
        error: `Too many AI requests. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`,
      },
      {
        "retry-after": String(rateLimit.retryAfterSeconds),
        "x-ratelimit-limit": String(RATE_LIMIT_MAX_REQUESTS),
        "x-ratelimit-remaining": String(rateLimit.remaining),
      },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error: "AI is not configured yet. Please set ANTHROPIC_API_KEY in Netlify.",
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const question = typeof payload?.question === "string" ? payload.question.trim() : "";
  if (!question) {
    return jsonResponse(400, { error: "Question is required." });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return jsonResponse(400, {
      error: `Question is too long (max ${MAX_QUESTION_CHARS} characters).`,
    });
  }

  try {
    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!apiResponse.ok) {
      const detail = await apiResponse.text();
      console.error("Anthropic API error", apiResponse.status, detail);
      return jsonResponse(502, { error: "Upstream AI request failed." });
    }

    const data = await apiResponse.json();
    const answer = Array.isArray(data?.content)
      ? data.content
          .filter((block) => block?.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim()
      : "";

    if (!answer) {
      return jsonResponse(502, { error: "AI returned an empty response." });
    }

    return jsonResponse(200, { answer });
  } catch (err) {
    console.error("ask-ai handler crashed", err);
    return jsonResponse(500, { error: "Something went wrong. Try again in a moment." });
  }
}
