// assets/script.js — drop-in replacement

// ====== CONFIG ======
const ENDPOINT = "https://apim-tourscheduler-sbx.azure-api.net/tours/book"; // or your APIM URL

// ====== UI helpers ======
function show(msg, cls = "info") {
  const el = document.getElementById("status");
  el.textContent = msg || "";
  el.className = "status " + cls;
  el.style.display = msg ? "block" : "none";
}

function combineDateTime(dateVal, hhmm) {
  if (!dateVal || !hhmm) return "";
  const local = `${dateVal}T${hhmm}`; // yyyy-MM-ddTHH:mm
  const d = new Date(local);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

function to24(hh, mm, mer) {
  if (!hh || !mm || !mer) return "";
  let h = parseInt(hh, 10) % 12;
  if (mer === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${mm}`;
}

// ====== init min + steps ======
(function init() {
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const d = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dateEl = document.getElementById("TourDate");
  if (dateEl) dateEl.min = d;

  // ensure minute selects are quarter-hour only (HTML already limits options)
  // no-op here on purpose to keep behavior consistent across browsers
})();

// ====== phone auto-format ======
(function wirePhoneMask() {
  const phone = document.getElementById("Phone");
  if (!phone) return;

  function format(val) {
    const d = val.replace(/\D/g, "").slice(0, 10);
    const a = d.slice(0, 3), b = d.slice(3, 6), c = d.slice(6, 10);
    if (d.length > 6) return `(${a}) ${b}-${c}`;
    if (d.length > 3) return `(${a}) ${b}`;
    if (d.length > 0) return `(${a}`;
    return "";
  }

  phone.addEventListener("input", (e) => {
    const before = e.target.value;
    const selStart = e.target.selectionStart;
    e.target.value = format(before);
    // keep it simple: caret to end
    e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
  });

  phone.addEventListener("blur", (e) => {
    e.target.value = format(e.target.value);
  });
})();

// ====== form wiring ======
const form = document.getElementById("tourForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    form.reset();
    show("", "info");
  });
}

if (submitBtn) {
  submitBtn.addEventListener("click", handleSubmit);
}

async function handleSubmit() {
  // Read values
  const Company        = document.getElementById("Company").value.trim();
  const RequesterName  = document.getElementById("RequesterName").value.trim();
  const RequesterEmail = document.getElementById("RequesterEmail").value.trim();
  const Phone          = document.getElementById("Phone").value.trim();
  const PartySize      = document.getElementById("PartySize").value.trim();
  const TourDate       = document.getElementById("TourDate").value.trim();
  const Reason         = document.getElementById("Reason").value.trim();

  // New dropdowns
  const StartHour = document.getElementById("StartHour").value.trim();
  const StartMin  = document.getElementById("StartMin").value.trim();
  const StartMer  = document.getElementById("StartMer").value.trim();
  const EndHour   = document.getElementById("EndHour").value.trim();
  const EndMin    = document.getElementById("EndMin").value.trim();
  const EndMer    = document.getElementById("EndMer").value.trim();

  const startHHMM = to24(StartHour, StartMin, StartMer);
  const endHHMM   = to24(EndHour, EndMin, EndMer);

  const start = combineDateTime(TourDate, startHHMM);
  const end   = combineDateTime(TourDate, endHHMM);

  // Basic validation
  if (!Company || !RequesterName || !RequesterEmail || !TourDate || !start || !end) {
    show("Please fill all required fields (Company, Requester, Email, Date, Start, End).", "err");
    return;
  }
  if (new Date(end) <= new Date(start)) {
    show("End time must be after start time.", "err");
    return;
  }

  // Submit
  submitBtn.disabled = true;
  submitBtn.classList.add("loading");
  show("Submitting…", "info");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: Company,
        requesterName: RequesterName,
        requesterEmail: RequesterEmail,
        phone: Phone,
        partySize: PartySize,
        start, // UTC ISO
        end,   // UTC ISO
        reason: Reason
      })
    });

    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!res.ok) {
      show(`Oops: ${data.error || data.message || res.statusText || "Request failed"}`, "err");
      return;
    }

    show(data.message || "Request received. We’ll email you once it’s scheduled.", "ok");
    form.reset();
  } catch (err) {
    show(`Network error: ${err.message}`, "err");
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
}
