// api/submitTour/index.js  (FINAL)
export default async function (context, req) {
  const url = process.env.BOOK_API_URL;

  if (!url) {
    context.res = { status: 500, body: 'Missing configuration: BOOK_API_URL' };
    return;
  }

  // Only pick the fields your downstream expects
  const b = req.body || {};
  const outbound = {
    company:        (b.company || '').trim(),
    requesterName:  (b.requesterName || '').trim(),
    requesterEmail: (b.requesterEmail || '').trim(),
    startUtc:       (b.startUtc || '').trim(),
    endUtc:         (b.endUtc || '').trim()
  };

  // quick validation to avoid upstream 400s
  for (const [k,v] of Object.entries(outbound)) {
    if (!v) {
      context.res = { status: 400, body: `Missing required field: ${k}` };
      return;
    }
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outbound)
    });

    const text = await r.text(); // try to read *something* even on errors

    if (r.ok || r.status === 201) {
      // let the browser show success
      context.res = { status: 201, body: text || 'Created' };
    } else {
      // bubble exact upstream error for visibility in DevTools
      context.res = { status: 502, body: `Upstream ${r.status} ${r.statusText}: ${text}` };
    }
  } catch (e) {
    context.res = { status: 502, body: `Forward call failed: ${e.message || e}` };
  }
}
