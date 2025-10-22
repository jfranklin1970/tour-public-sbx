const fetch = require("node-fetch");

const {
  TENANT_ID,
  CLIENT_ID,
  CLIENT_SECRET,
  SPO_SITE_HOSTNAME,
  SPO_SITE_PATH,
  SPO_LIST_NAME
} = process.env;

async function getAppOnlyToken(scope) {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope,
    grant_type: "client_credentials"
  });
  const r = await fetch(url, { method: "POST", body });
  if (!r.ok) throw new Error(`Token error: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

function toIsoZ(x) {
  if (!x) return null;
  // accept either ISO already, or 'yyyy-MM-ddTHH:mm' from <input type=datetime-local>
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": req.headers.origin || "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      }
    };
    return;
  }

  try {
    const {
      company,
      requesterName,
      requesterEmail,
      start,      // expects 'yyyy-MM-ddTHH:mm' or ISO
      end,        // expects 'yyyy-MM-ddTHH:mm' or ISO
      partySize,
      reason
    } = req.body || {};

    if (!company || !requesterName || !requesterEmail || !start || !end) {
      context.res = { status: 400, body: { error: "Missing required fields" } };
      return;
    }

    const preferredStart = toIsoZ(start);
    const preferredEnd   = toIsoZ(end);
    if (!preferredStart || !preferredEnd) {
      context.res = { status: 400, body: { error: "Invalid start/end" } };
      return;
    }

    const token = await getAppOnlyToken("https://graph.microsoft.com/.default");

    // Build list item payload (SharePoint modern list)
    const fields = {
      Title: `Vendor Tour — ${company}`,
      RequesterName: requesterName,
      RequesterEmail: requesterEmail,
      Company: company,
      PartySize: partySize ? Number(partySize) : null,
      Reason: reason || "",
      PreferredStart: preferredStart,
      PreferredEnd: preferredEnd,
      Status: "Pending"
    };

    // 1) Resolve siteId from hostname + path
    const siteUrl = `https://graph.microsoft.com/v1.0/sites/${SPO_SITE_HOSTNAME}:${SPO_SITE_PATH}`;
    const sRes = await fetch(siteUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!sRes.ok) throw new Error(`Get siteId failed: ${sRes.status} ${await sRes.text()}`);
    const site = await sRes.json();

    // 2) Create the list item
    const createUrl = `https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${encodeURIComponent(SPO_LIST_NAME)}/items`;
    const body = { fields }; // Graph expects { fields: { ... } }
    const iRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!iRes.ok) throw new Error(`Create item failed: ${iRes.status} ${await iRes.text()}`);
    const item = await iRes.json();

    context.res = {
      status: 201,
      headers: { "Access-Control-Allow-Origin": req.headers.origin || "*" },
      body: { ok: true, itemId: item?.id }
    };
  } catch (err) {
    context.log.error(err);
    context.res = {
      status: 500,
      headers: { "Access-Control-Allow-Origin": req.headers.origin || "*" },
      body: { error: err.message }
    };
  }
};
