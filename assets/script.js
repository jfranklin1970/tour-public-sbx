const form = document.getElementById('tourForm');
const statusEl = document.getElementById('status');

function toUtcIso(local) {
  // local -> Date -> UTC ISO like 2025-10-25T19:00:00Z
  if (!local) return '';
  const d = new Date(local);
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().replace(/\.\d{3}Z$/,'Z');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.className = 'status';
  statusEl.textContent = 'Submitting…';

  const payload = {
    company: (document.getElementById('company').value || '').trim(),
    requesterName: (document.getElementById('requesterName').value || '').trim(),
    requesterEmail: (document.getElementById('requesterEmail').value || '').trim(),
    startUtc: toUtcIso(document.getElementById('startLocal').value),
    endUtc: toUtcIso(document.getElementById('endLocal').value),
    partySize: (document.getElementById('partySize').value || '').trim(),
    reason: (document.getElementById('reason').value || '').trim()
  };

  try {
    const res = await fetch('/api/submitTour', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      statusEl.className = 'status ok';
      statusEl.textContent = 'Request received. We’ll email you once it’s scheduled.';
      form.reset();
    } else {
      const t = await res.text();
      throw new Error(t || `HTTP ${res.status}`);
    }
  } catch (err) {
    statusEl.className = 'status err';
    statusEl.textContent = `Oops: ${err.message}`;
  }
});
