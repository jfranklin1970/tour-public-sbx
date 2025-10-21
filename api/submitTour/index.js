// /api/submitTour/index.js
export default async function (context, req) {
  try {
    // Read config
    const BOOK_API_URL = process.env.BOOK_API_URL;
    if (!BOOK_API_URL) {
      context.res = { status: 500, jsonBody: { ok: false, error: 'BOOK_API_URL is not set' } };
      return;
    }

    // Parse & validate incoming payload
    const b = req.body || {};
    const company = (b.company || '').trim();
    const requesterName = (b.requesterName || '').trim();
    const requesterEmail = (b.requesterEmail || '').trim();
    const startUtc = (b.startUtc || '').trim();
    const endUtc = (b.endUtc || '').trim();

    if (!company || !requesterName || !requesterEmail || !startUtc || !endUtc) {
      context.res = { status: 400, jsonBody: { ok: false, error: 'Missing required fields' } };
      return;
    }

    // Forward only what the backend expects
    const outbound = { company, requesterName, requesterEmail, startUtc, endUtc };

    // Call your Function App’s book endpoint
    const r = await fetch(BOOK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outbound),
    });

    const text = await r.text(); // capture body even on errors

    if (r.ok || r.status === 201) {
      context.res = { status: 201, jsonBody: { ok: true } };
    } else {
      context.res = {
        status: 502,
        jsonBody: { ok: false, error: `Upstream ${r.status}: ${text}` }
      };
    }
  } catch (e) {
    context.res = { status: 500, jsonBody: { ok: false, error: `Function crash: ${e.message}` } };
  }
}
