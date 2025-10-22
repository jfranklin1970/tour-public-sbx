// script.js

const form = document.getElementById('tourForm');
const statusEl = document.getElementById('status');

function toUtcIso(local) {
  if (!local) return null;
  const d = new Date(local);
  // Convert local time to UTC ISO without milliseconds
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z');
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Build payload
  const payload = {
    company:        val('company'),
    requesterName:  val('requesterName'),
    requesterEmail: val('requesterEmail'),
    startUtc:       toUtcIso(val('start')),
    endUtc:         toUtcIso(val('end')),
    partySize:      Number(val('partySize')) || null,
    reason:         val('reason') || null
  };

  // Client-side validation to stop “Missing required fields”
  for (const k of ['company', 'requesterName', 'requesterEmail']) {
    if (!payload[k]) {
      statusEl.className = 'error';
      statusEl.textContent = `Missing: ${k}`;
      return;
    }
  }

  statusEl.className = 'status';
  statusEl.textContent = 'Submitting…';

  let res, text;
  try {
    res = await fetch('/api/submitTour', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Network / CORS / offline errors
    statusEl.className = 'error';
    statusEl.textContent = `Network error: ${err.message}`;
    console.error('fetch failed', err);
    return;
  }

  try { text = await res.text(); } catch { text = ''; }

  // Try to parse JSON, but keep raw text for debugging
  let data;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = { raw: text }; }

  if (!res.ok) {
    // Show detailed message returned by the API
    const msg = data?.error || data?.message || data?.raw || `HTTP ${res.status}`;
    statusEl.className = 'error';
    statusEl.textContent = `Server error ${res.status}: ${msg}`;
    console.error('Server error', res.status, data || text);
    return;
  }

  statusEl.className = 'ok';
  statusEl.textContent = 'Request received!';
});
