// DO NOT import node-fetch; Node 18+ has global fetch in Azure Functions.
// import fetch from "node-fetch";

export default async function (context, req) {
  try {
    // 1) Validate incoming payload
    const { company, requesterName, requesterEmail, startUtc, endUtc, partySize, reason } = req.body || {};
    if (!company || !requesterName || !requesterEmail) {
      context.res = { status: 400, body: { error: "Missing required fields" } };
      return;
    }

    // 2) Validate required env vars early (fail fast, readable)
    const required = [
      "TENANT_ID",
      "CLIENT_ID",
      "CLIENT_SECRET",
      "SPO_SITE_HOSTNAME",
      "SPO_SITE_PATH",
      "SPO_LIST_NAME"
    ];
    for (const k of required) {
      if (!process.env[k]) throw new Error(`Missing environment variable: ${k}`);
    }

    const tenantId   = process.env.TENANT_ID;
    const clientId   = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const siteHost   = process.env.SPO_SITE_HOSTNAME;   // e.g. kofile0.sharepoint.com
    const sitePath   = process.env.SPO_SITE_PATH;       // e.g. /sites/KO-TourOperations
    const listName   = process.env.SPO_LIST_NAME;       // e.g. TourRequests

    // 3) AAD token for Microsoft Graph
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      })
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(`Token error: ${tokenJson.error_description || JSON.stringify(tokenJson)}`);
    }
    const accessToken = tokenJson.access_token;

    // 4) Build SharePoint list item payload
    const item = {
      fields: {
        Title: company,
        Company: company,
        RequesterName: requesterName,
        RequesterEmail: requesterEmail,
        PreferredStart: startUtc || null,
        PreferredEnd: endUtc || null,
        PartySize: partySize ?? null,
        Reason: reason || "N/A",
        Status: "Submitted"
      }
    };

    // 5) Create item in SharePoint via Graph
    const graphUrl = `https://graph.microsoft.com/v1.0/sites/${siteHost}:${sitePath}:/lists/${encodeURIComponent(listName)}/items`;
    const spRes = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(item)
    });

    const spJson = await spRes.json();
    if (!spRes.ok) {
      // Log everything server-side and return a readable error
      context.log("Graph error:", spJson);
      throw new Error(spJson?.error?.message || JSON.stringify(spJson));
    }

    // 6) Success
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { message: "Request stored", id: spJson?.id || spJson?.data?.id || null }
    };

  } catch (err) {
    // Make sure we always return a response (avoid 0 content-length)
    context.log.error("Function error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: String(err.message || err) }
    };
  }
}
