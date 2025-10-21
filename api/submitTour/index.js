import fetch from "node-fetch";

export default async function (context, req) {
  const { company, requesterName, requesterEmail, startUtc, endUtc, partySize, reason } = req.body || {};

  // Validate required fields
  if (!company || !requesterEmail || !requesterName) {
    context.res = {
      status: 400,
      body: { error: "Missing required fields" }
    };
    return;
  }

  // Load env vars
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const siteHost = process.env.SPO_SITE_HOSTNAME;
  const sitePath = process.env.SPO_SITE_PATH;
  const listName = process.env.SPO_LIST_NAME;

  try {
    // Get access token for Graph
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
    const { access_token } = await tokenRes.json();

    // Build payload for SharePoint list
    const item = {
      fields: {
        Title: company,
        Company: company,
        RequesterName: requesterName,
        RequesterEmail: requesterEmail,
        PreferredStart: startUtc,
        PreferredEnd: endUtc,
        PartySize: partySize || 0,
        Reason: reason || "N/A",
        Status: "Submitted"
      }
    };

    // Create item in SharePoint
    const graphUrl = `https://graph.microsoft.com/v1.0/sites/${siteHost}:${sitePath}:/lists/${listName}/items`;
    const graphRes = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(item)
    });

    const graphData = await graphRes.json();

    if (!graphRes.ok) {
      context.log("Graph error:", graphData);
      throw new Error(graphData.error?.message || "SharePoint insert failed");
    }

    context.res = {
      status: 200,
      body: { message: "Request received and stored successfully", id: graphData.id }
    };

  } catch (err) {
    context.log("Function error:", err);
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  }
}
