async function fetchMe() {
  const res = await fetch("/account/data", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data && data.user ? data.user : null;
}

function setMsg(text, kind = "") {
  const el = document.getElementById("msg");
  el.textContent = text || "";
  el.className = "msg " + (kind || "");
}

async function postEvent(body) {
  const res = await fetch("/eventdata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const location = res.headers.get("Location") || null;
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data, location };
}

function extractIdFromLocation(loc) {
  const m = (loc || "").match(/\/(\d+)(?:\D*$)?/);
  return m ? Number(m[1]) : null;
}

document.addEventListener("DOMContentLoaded", async () => {
  setMsg("Lade Benutzer…");
  const me = await fetchMe();
  if (!me) {
    setMsg("Bitte zuerst einloggen. Weiterleitung…", "error");
    setTimeout(() => (window.location.href = "/account.html"), 1000);
    return;
  }
  if (!me.is_organizer) {
    setMsg("Nur Organizer dürfen Events erstellen. Weiterleitung…", "error");
    setTimeout(() => (window.location.href = "/account.html"), 1200);
    return;
  }
  setMsg("");

  const form = document.getElementById("eventForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("Speichere…");
    const title = document.getElementById("title").value.trim();
    const eventDate = document.getElementById("eventDate").value;
    const location = document.getElementById("location").value.trim();
    const categoryName =
      (document.getElementById("categoryName").value || "").trim() || null;
    const priceRaw = document.getElementById("price").value;
    const capacityRaw = document.getElementById("capacity").value;
    const description =
      (document.getElementById("description").value || "").trim() || null;
    const price = Number(priceRaw);
    const capacity = parseInt(capacityRaw, 10);

    const errors = [];
    if (!title) errors.push("Titel");
    if (!eventDate) errors.push("Datum");
    if (!location) errors.push("Ort");
    if (!Number.isFinite(price) || price < 0) errors.push("Preis");
    if (!Number.isInteger(capacity) || capacity < 0) errors.push("Kapazität");
    if (errors.length) {
      setMsg("Bitte prüfen: " + errors.join(", "), "error");
      return;
    }

    const payload = {
      title,
      eventDate,
      location,
      price,
      capacity,
      description,
      categoryName,
    };
    const { ok, status, data, location: locHdr } = await postEvent(payload);

    if (!ok) {
      const msg = (data && (data.detail || data.title)) || `Fehler (${status})`;
      setMsg(msg, "error");
      return;
    }

    setMsg("Event gespeichert ✔ – Weiterleitung…", "success");
    let id =
      extractIdFromLocation(locHdr) ||
      (data && data.id ? Number(data.id) : null);
    let target = id ? `/my-event.html?open=${id}` : `/my-events.html`;
    setTimeout(() => (window.location.href = target), 900);
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("Speichere…");

  const formData = new FormData(form); // gets title, date, location, category, price, capacity, description + file

  const res = await fetch("/eventdata", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setMsg(data.detail || `Fehler (${res.status})`, "error");
    return;
  }

  setMsg("Event gespeichert ✔ – Weiterleitung…", "success");
  setTimeout(
    () => (window.location.href = `/my-event.html?open=${data.id}`),
    900
  );
});
