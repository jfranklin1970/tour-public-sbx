// Azure Function (Node 18+) — HTTP trigger
// Purpose: accept public form posts, handle CORS, validate, and echo back.
// Later we can swap the echo with SharePoint/Flow logic.

const ALLOW_ORIGINS =
  (process.env.ALLOW_ORIGINS || "*")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

// Build CORS headers for the current request origin
function makeCorsHeaders(origin) {
  const wildcard = ALLOW_ORIGINS.includes("*");
  const allowed =
    wildcard || (origin && ALLOW_ORIGINS.includes(origin));

  return {
    "Access-Control-Allow-Origin": allowed ? (wildcard ? "*" : origin) : ALLOW_ORIGINS[0] || "*",
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-functions-key"
  };
}

module.exports = async function (context, req) {
  const origin = req.headers?.origin || "";
  const cors = makeCorsHeaders(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: cors };
    return;
  }

  // Only POST is allowed
  if (req.method !== "POST") {
    context.res = {
      status: 405,
      headers: cors,
      body: { error: "Method Not Allowed" }
    };
    return;
  }

  // Parse body safely (supports JSON body or rawBody)
  let body = req.body;
  if (!body && req.rawBody) {
    try { body = JSON.parse(req.rawBody); } catch { /* noop */ }
  }

  // Basic field validation (adjust as needed)
  const required = [
    "company",
    "requesterName",
    "requesterEmail",
    "preferredStart",
    "preferredEnd"
  ];

  const missing = required.filter(f => !body || body[f] == null || body[f] === "");
  if (missing.length) {
    context.res = {
      status: 400,
      headers: cors,
      body: { error: "Missing required fields", missing }
    };
    return;
  }

  // At this point, the payload is valid and you can plug in your real logic
  // (e.g., call Microsoft Graph to create a SharePoint list item).
  // For now we just echo success so the frontend shows “Request received”.
  context.log("submitTour payload:", body);

  context.res = {
    status: 200,
    headers: cors,
    body: {
      ok: true,
      message: "Request received",
      data: {
        company: body.company,
        requesterName: body.requesterName,
        requesterEmail: body.requesterEmail,
        preferredStart: body.preferredStart,
        preferredEnd: body.preferredEnd
      }
    }
  };
};
