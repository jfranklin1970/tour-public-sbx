// Azure Function: POST /api/submitTour
// Works in Functions v3/v4; handles OPTIONS preflight; validates required fields

module.exports = async function (context, req) {
  // 1) CORS preflight support (OPTIONS)
  if (req.method === 'OPTIONS') {
    context.log('CORS preflight hit');
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',              // tighten in prod
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    };
  }

  // 2) Try to parse JSON body (supports both v3 and v4 styles)
  let body = null;
  try {
    // v4 style has req.body as object already; v3 sometimes needs req.rawBody
    if (req.body && typeof req.body === 'object') {
      body = req.body;
    } else if (req.rawBody) {
      body = JSON.parse(req.rawBody);
    } else if (typeof req.text === 'function') {
      // in case of streams
      const text = await req.text();
      body = text ? JSON.parse(text) : null;
    } else if (typeof req.json === 'function') {
      // v4 style helper
      body = await req.json();
    }
  } catch (e) {
    context.log.warn('Body parse failed:', e.message);
  }

  const contentType = (req.headers && (req.headers['content-type'] || req.headers['Content-Type'])) || '';
  context.log('submitTour: method=%s content-type=%s', req.method, contentType);
  context.log('submitTour: body=', body);

  // 3) Validate required fields
  const required = ['company', 'requesterName', 'requesterEmail', 'startUtc', 'endUtc'];
  const missing = required.filter((k) => !body || body[k] == null || body[k] === '');

  if (missing.length) {
    return {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        error: 'Missing required fields',
        missing,
        hint: 'Send JSON with company, requesterName, requesterEmail, startUtc, endUtc',
      },
    };
  }

  // 4) TODO: here is where you’ll call SharePoint / Graph to add list item, etc.
  // For now we echo back to confirm the end-to-end flow is correct.
  // (You already validated the website->function path; next step is writing to SharePoint.)
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: {
      ok: true,
      received: body,
      // You can also return an ID from SharePoint once we wire that up.
    },
  };
};
