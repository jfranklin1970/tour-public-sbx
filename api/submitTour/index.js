const fetch = require("node-fetch");
CLIENT_SECRET,
SPO_SITE_HOSTNAME,
SPO_SITE_PATH,
SPO_LIST_NAME
} = process.env;


async function getAppOnlyToken(scope) {
const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
const body = new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, scope, grant_type: "client_credentials" });
const r = await fetch(url, { method: "POST", body });
if (!r.ok) throw new Error(`Token error: ${r.status} ${await r.text()}`);
return (await r.json()).access_token;
}


function toIsoZ(x) {
if (!x) return null;
const d = new Date(x);
if (Number.isNaN(d.getTime())) return null;
return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().replace(/\.\d{3}Z$/, "Z");
}


module.exports = async function (context, req) {
if (req.method === "OPTIONS") {
context.res = { status: 204, headers: { "Access-Control-Allow-Origin": req.headers.origin || "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" } };
return;
}


try {
const { company, requesterName, requesterEmail, phone, partySize, start, end, reason } = req.body || {};
if (!company || !requesterName || !requesterEmail || !start || !end) {
context.res = { status: 400, body: { error: "Missing required fields" } }; return;
}


const preferredStart = toIsoZ(start);
const preferredEnd = toIsoZ(end);
if (!preferredStart || !preferredEnd) { context.res = { status: 400, body: { error: "Invalid start/end" } }; return; }
if (new Date(preferredEnd) <= new Date(preferredStart)) { context.res = { status: 400, body: { error: "End must be after start" } }; return; }


const token = await getAppOnlyToken("https://graph.microsoft.com/.default");


const siteUrl = `https://graph.microsoft.com/v1.0/sites/${SPO_SITE_HOSTNAME}:${SPO_SITE_PATH}`;
const sRes = await fetch(siteUrl, { headers: { Authorization: `Bearer ${token}` } });
if (!sRes.ok) throw new Error(`Get siteId failed: ${sRes.status} ${await sRes.text()}`);
const site = await sRes.json();


const fields = {
  Title: `Vendor Tour — ${company}`,
  Company: company,
  Requesters_x0020_Name: requesterName,
  Requesters_x0020_Email: requesterEmail,
  Phone: phone || "",
  Party_x0020_Size: partySize ? Number(partySize) : null,
  Reason: reason || "",
  Preferred_x0020_Start: preferredStart,
  Preferred_x0020_End: preferredEnd,
  Status: "Pending"
};



const createUrl = `https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${encodeURIComponent(SPO_LIST_NAME)}/items`;
const iRes = await fetch(createUrl, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
if (!iRes.ok) throw new Error(`Create item failed: ${iRes.status} ${await iRes.text()}`);
const item = await iRes.json();


context.res = { status: 201, headers: { "Access-Control-Allow-Origin": req.headers.origin || "*" }, body: { ok: true, itemId: item?.id, message: "Request received" } };
} catch (err) {
context.log.error(err);
context.res = { status: 500, headers: { "Access-Control-Allow-Origin": req.headers.origin || "*" }, body: { error: err.message } };
}
};
