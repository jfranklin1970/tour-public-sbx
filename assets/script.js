// Config: if using APIM, set ENDPOINT to your gateway URL; otherwise keep "/api/submitTour" for the Azure Function.
const pad = n => String(n).padStart(2,'0');
const now = new Date();
const d = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
const t = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
document.getElementById('TourDate').min = d;
document.getElementById('StartTime').step = 60;
document.getElementById('EndTime').step = 60;
})();


// Wire up buttons
const form = document.getElementById('tourForm');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');


resetBtn.addEventListener('click', () => { form.reset(); show('', 'info'); document.getElementById('status').style.display = 'none'; });
submitBtn.addEventListener('click', handleSubmit);


async function handleSubmit() {
const Company = document.getElementById('Company').value.trim();
const RequesterName = document.getElementById('RequesterName').value.trim();
const RequesterEmail = document.getElementById('RequesterEmail').value.trim();
const Phone = document.getElementById('Phone').value.trim();
const PartySize = document.getElementById('PartySize').value.trim();
const TourDate = document.getElementById('TourDate').value.trim();
const Reason = document.getElementById('Reason').value.trim();

function to24(hh, mm, mer){ let h=parseInt(hh,10)%12; if(mer==='PM') h+=12; return `${String(h).padStart(2,'0')}:${mm}`; }

const startHHMM = to24(
  document.getElementById('StartHour').value,
  document.getElementById('StartMin').value,
  document.getElementById('StartMer').value
);
const endHHMM = to24(
  document.getElementById('EndHour').value,
  document.getElementById('EndMin').value,
  document.getElementById('EndMer').value
);

const start = combineDateTime(document.getElementById('TourDate').value, startHHMM);
const end   = combineDateTime(document.getElementById('TourDate').value, endHHMM);



const start = combineDateTime(TourDate, StartTime);
const end = combineDateTime(TourDate, EndTime);


if (!Company || !RequesterName || !RequesterEmail || !start || !end) {
show('Please fill all required fields (Company, Requester, Email, Date, Start, End).', 'err');
return;
}


// Simple client-side guard: end must be after start
if (new Date(end) <= new Date(start)) {
show('End time must be after start time.', 'err');
return;
}


submitBtn.disabled = true; submitBtn.classList.add('loading'); show('Submitting…','info');


try {
const res = await fetch(ENDPOINT, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
company: Company,
requesterName: RequesterName,
requesterEmail: RequesterEmail,
phone: Phone,
partySize: PartySize,
start, // UTC ISO
end, // UTC ISO
reason: Reason
})
});


const text = await res.text();
let data; try { data = JSON.parse(text); } catch { data = { message: text }; }


if (!res.ok) {
show(`Oops: ${data.message || data.error || res.statusText || 'Request failed'}`, 'err');
} else {
show(data.message || 'Request received. We\'ll email you once it\'s scheduled.', 'ok');
form.reset();
}
} catch (err) {
show(`Network error: ${err.message}`, 'err');
} finally {
submitBtn.disabled = false; submitBtn.classList.remove('loading');
}
}
