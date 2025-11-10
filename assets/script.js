// LOCAL-ONLY (Central) — no timezone math anywhere.
// We send "YYYY-MM-DDTHH:mm:00" as plain strings.

const ENDPOINT = "https://apim-tourscheduler-sbx.azure-api.net/tours/book";

function show(msg, cls = "info") {
  const el = document.getElementById("status");
  el.textContent = msg || "";
  el.className = "status " + cls;
  el.style.display = msg ? "block" : "none";
}

function to24(hh, mm, mer) {
  if (!hh || !mm || !mer) return "";
  let h = parseInt(hh, 10) % 12;
  if (mer === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${mm}`;
}

// Build local string (NO Z)
function combineLocalString(dateVal, hhmm) {
  if (!dateVal || !hhmm) return "";
  return `${dateVal}T${hhmm}:00`; // e.g., 2025-11-30T14:00:00
}

// phone mask
(function () {
  const phone = document.getElementById("Phone");
  if (!phone) return;
  function fmt(v) {
    const d = v.replace(/\D/g, "").slice(0, 10);
    const a = d.slice(0, 3), b = d.slice(3, 6), c = d.slice(6);
    if (d.length > 6) return `(${a}) ${b}-${c}`;
    if (d.length > 3) return `(${a}) ${b}`;
    if (d.length > 0) return `(${a}`;
    return "";
  }
  phone.addEventListener("input", e => { e.target.value = fmt(e.target.value); e.target.selectionStart = e.target.selectionEnd = e.target.value.length; });
  phone.addEventListener("blur",  e => { e.target.value = fmt(e.target.value); });
})();

const form = document.getElementById("tourForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");

resetBtn?.addEventListener("click", () => { form.reset(); show("", "info"); });
submitBtn?.addEventListener("click", handleSubmit);

async function handleSubmit() {
  const Company        = document.getElementById("Company").value.trim();
  const RequesterName  = document.getElementById("RequesterName").value.trim();
  const RequesterEmail = document.getElementById("RequesterEmail").value.trim();
  const Phone          = document.getElementById("Phone").value.trim();
  const PartySize      = document.getElementById("PartySize").value.trim();
  const TourDate       = document.getElementById("TourDate").value.trim();
  const Reason         = document.getElementById("Reason").value.trim();

  const StartHour = document.getElementById("StartHour").value.trim();
  const StartMin  = document.getElementById("StartMin").value.trim();
  const StartMer  = document.getElementById("StartMer").value.trim();
  const EndHour   = document.getElementById("EndHour").value.trim();
  const EndMin    = document.getElementById("EndMin").value.trim();
  const EndMer    = document.getElementById("EndMer").value.trim();

  const startHHMM = to24(StartHour, StartMin, StartMer);
  const endHHMM   = to24(EndHour, EndMin, EndMer);

  const startLocal = combineLocalString(TourDate, startHHMM);
  const endLocal   = combineLocalString(TourDate, endHHMM);

  if (!Company || !RequesterName || !RequesterEmail || !TourDate || !startLocal || !endLocal) {
    show("Please fill all required fields.", "err"); return;
  }

  // Simple sanity (string -> Date parser uses device tz; we only compare ordering)
  if (new Date(endLocal) <= new Date(startLocal)) {
    show("End time must be after start time.", "err"); return;
  }

  submitBtn.disabled = true; show("Submitting…", "info");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: Company,
        requesterName: RequesterName,
        requesterEmail: RequesterEmail,
        phone: Phone,
        partySize: Number(PartySize) || null,
        // LOCAL (Central) strings — no Z, no offset
        startLocal,
        endLocal,
        reason: Reason
      })
    });

    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!res.ok) { show(`Oops: ${data.error || data.message || res.statusText || "Request failed"}`, "err"); return; }

    show(data.message || "Request received.", "ok");
    form.reset();
  } catch (err) {
    show(`Network error: ${err.message}`, "err");
  } finally {
    submitBtn.disabled = false;
  }
}
