// Azure Functions v4 (Node 18). Uses built-in fetch.
// APP SETTINGS required (Function App → Configuration):
// TENANT_ID, CLIENT_ID, CLIENT_SECRET
// SPO_HOSTNAME = kofile0.sharepoint.com
// SPO_SITE_PATH = /sites/KO-TourOperations
// SPO_LIST_NAME = TourRequests

const TOKEN_URL = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;
const GRAPH = "https://graph.microsoft.com/v1.0";

async function getToken() {
  const body = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function getSiteId(tok) {
  const url = `${GRAPH}/sites/${process.env.SPO_HOSTNAME}:${process.env.SPO_SITE_PATH}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
  if (!r.ok) throw new Error(`site ${r.status}: ${await r.text()}`);
  return (await r.json()).id;
}

async function getListId(tok, siteId, listName) {
  const url = `${GRAPH}/sites/${siteId}/lists?$filter=displayName eq '${listName.replace(/'/g, "''")}'`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
  if (!r.ok) throw new Error(`list ${r.status}: ${await r.text()}`);
  const v = (await r.json()).value;
  if (!v?.[0]) throw new Error(`list not found: ${listName}`);
  return v[0].id;
}

function toIsoOrBlank(v) {
  if (!v) return "";
  // accept already-ISO, or date strings from the form
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

async function createItem(tok, siteId, listId, fields) {
  const url = `${GRAPH}/sites/${siteId}/lists/${listId}/items`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`create ${r.status}: ${await r.text()}`);
}

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
    return;
  }

  try {
    const b = req.body || {};

    // Map your exact SharePoint columns
    const fields = {
      Title: `${b.company ?? b.Company ?? "Tour"} request`,
      RequesterName: b.requesterName ?? b.RequesterName ?? "",
      RequesterEmail: b.requesterEmail ?? b.RequesterEmail ?? "",
      Phone: b.phone ?? b.Phone ?? "",
      Company: b.company ?? b.Company ?? "",
      PartySize: b.partySize ?? b.PartySize ?? null,
      Status: "Pending Approval",
      Reason: b.reason ?? b.Reason ?? "",
      PreferredStart: toIsoOrBlank(b.startUtc ?? b.PreferredStart),
      PreferredEnd: toIsoOrBlank(b.endUtc ?? b.PreferredEnd),
      Notes: b.notes ?? b.Notes ?? "",
    };

    const tok = await getToken();
    const siteId = await getSiteId(tok);
    const listId = await getListId(tok, siteId, process.env.SPO_LIST_NAME);
    await createItem(tok, siteId, listId, fields);

    context.res = {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*" },
    };
  } catch (e) {
    context.log.error(e?.stack || String(e));
    context.res = {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: { error: "SharePoint write failed" },
    };
  }
};
