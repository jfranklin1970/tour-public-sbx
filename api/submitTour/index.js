// Node 18 Azure Functions (SWA integrated)
// Reads BOOK_API_URL from env and forwards a validated payload.
export default async function (context, req) {
  const BOOK_API_URL = process.env.BOOK_API_URL; // e.g. your tourscheduler function URL w/ ?code=...
  if (!BOOK_API_URL) {
    context.res = { status: 500, body: 'Missing configuration: BOOK_API_URL' };
    return;
  }

  const b = req.body || {};
  const company = (b.company || '').trim();
  const requesterName = (b.requesterName || '').trim();
  const requesterEmail = (b.requesterEmail || '').trim();
  const startUtc = (b.startUtc || '').trim();
  const endUtc = (b.endUtc || '').trim();

  // Basic validation (keep it strict so the downstream never 400s)
  if (!company || !requesterName || !requesterEmail || !startUtc || !endUtc) {
    context.res = { status: 400, body: 'Missing required fields.' };
    return;
  }

  // Only forward the fields your function expects
  const outbound = { company, requesterName, requesterEmail, startUtc, endUtc };

  try {
    const r = await fetch(BOOK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outbound),
    });

    if (r.ok || r.status === 201) {
      context.res = { status: 201, body: 'Created' };
    } else {
      const text = await r.text();
      context.res = { status: 502, body: `Upstream error: ${r.status} ${text}` };
    }
  } catch (e) {
    context.res = { status: 502, body: `Call failed: ${e.message}` };
  }
}
