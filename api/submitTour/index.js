// Node 18 SWA Function
export default async function (context, req) {
  const BOOK_API_URL = process.env.BOOK_API_URL;
  if (!BOOK_API_URL) {
    context.res = { status: 500, body: { ok: false, error: 'Missing BOOK_API_URL' } };
    return;
  }

  const b = req.body || {};
  const company        = (b.company || '').trim();
  const requesterName  = (b.requesterName || '').trim();
  const requesterEmail = (b.requesterEmail || '').trim();
  const startUtc       = (b.startUtc || '').trim();
  const endUtc         = (b.endUtc || '').trim();

  if (!company || !requesterName || !requesterEmail || !startUtc || !endUtc) {
    context.res = { status: 400, body: { ok: false, error: 'Missing required fields' } };
    return;
  }

  const outbound = { company, requesterName, requesterEmail, startUtc, endUtc };

  try {
    const upstream = await fetch(BOOK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outbound),
    });

    const upstreamText = await upstream.text().catch(() => '');

    if (upstream.ok || upstream.status === 201) {
      context.res = { status: 200, body: { ok: true } }; // normalize to 200 JSON
    } else {
      context.res = {
        status: 502,
        body: { ok: false, upstreamStatus: upstream.status, upstreamBody: upstreamText }
      };
    }
  } catch (e) {
    context.res = { status: 502, body: { ok: false, error: String(e) } };
  }
}
