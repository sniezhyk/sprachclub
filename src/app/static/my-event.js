const EVENT_BASE = "/eventdata";

// ---------- Hilfsfunktionen ----------
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

function setDlgMsg(text, kind = "") {
  const el = document.getElementById("dlgMsg");
  el.textContent = text || "";
  el.className = "msg " + (kind || "");
}

function fmtEuro(n) {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(n);
  } catch {
    return `${n} €`;
  }
}
function toISODateOnly(s) {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(+d)) return "";
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------- API ----------
async function apiMyEvents() {
  const res = await fetch(`${EVENT_BASE}/my`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function apiGetEvent(id) {
  const res = await fetch(`${EVENT_BASE}/${id}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function apiUpdateEvent(id, body) {
  const res = await fetch(`${EVENT_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body), // WICHTIG: ohne "id"
  });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

async function apiDeleteEvent(id) {
  const res = await fetch(`${EVENT_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

async function apiEventStats(id) {
  const res = await fetch(`/statistic/${id}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}


// ---------- UI Rendering ----------
let ALL = []; // Originaldaten
let FILTERED = [];
let CURRENT_ID = null;

function card(ev) {
  const date = toISODateOnly(ev.eventDate || ev.eventdate);
  const cat = ev.categoryName || ev.categoryname || null;
  const desc = ev.description || "";
  const cap = ev.capacity;
  const price = ev.price;

  const el = document.createElement("article");
  el.className = "card";

  el.innerHTML = `
    <h3>${ev.title ?? "Ohne Titel"}</h3>
    <div class="meta">
      <span>${date || "kein Datum"}</span> •
      <span>${ev.location || "kein Ort"}</span>
      ${cat ? `• <span class="badge">${cat}</span>` : ""}
    </div>
    <div class="pricecap">${fmtEuro(price ?? 0)} · Kapazität: ${Number.isFinite(cap) ? cap : "-"}</div>
    <p class="muted">${(desc || "").slice(0, 140)}${desc && desc.length > 140 ? "…" : ""}</p>
    <div class="actions">
      <button class="btn btn-primary" data-act="edit">Öffnen</button>
      <button class="btn" data-act="stats">Statistik</button>
      <button class="btn" data-act="refresh">Neu laden</button>
      <button class="btn btn-danger" data-act="delete">Löschen</button>
    </div>
  `;

  el.querySelector('[data-act="edit"]').addEventListener("click", () =>
    openEditor(ev.id)
  );
  el.querySelector('[data-act="refresh"]').addEventListener(
    "click",
    async () => {
      const { ok, data } = await apiGetEvent(ev.id);
      if (ok) {
        // Ersetze in ALL
        const idx = ALL.findIndex((x) => x.id === ev.id);
        if (idx >= 0) ALL[idx] = data;
        applyFilterAndRender();
        setMsg("Event aktualisiert.", "success");
      } else {
        setMsg(data?.detail || "Konnte Event nicht neu laden", "error");
      }
    }
  );
  el.querySelector('[data-act="delete"]').addEventListener("click", () =>
    confirmDelete(ev.id, ev.title)
  );
  el.querySelector('[data-act="stats"]').addEventListener("click", () =>
    openStats(ev.id)
  );

  return el;
}

function renderList() {
  const list = document.getElementById("list");
  list.innerHTML = "";
  if (!FILTERED.length) {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<p class="muted">Keine Events gefunden.</p>`;
    list.appendChild(d);
    return;
  }
  FILTERED.forEach((ev) => list.appendChild(card(ev)));
}

function applyFilterAndRender() {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const sort = document.getElementById("sort").value;

  FILTERED = ALL.filter((ev) => {
    const hay = [
      ev.title,
      ev.location,
      ev.categoryName || ev.categoryname,
      ev.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !q || hay.includes(q);
  });

  const dateOf = (ev) =>
    new Date(
      toISODateOnly(ev.eventDate || ev.eventdate) || "2100-01-01"
    ).getTime();
  if (sort === "date-asc") FILTERED.sort((a, b) => dateOf(a) - dateOf(b));
  if (sort === "date-desc") FILTERED.sort((a, b) => dateOf(b) - dateOf(a));
  if (sort === "title-asc")
    FILTERED.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""))
    );
  if (sort === "title-desc")
    FILTERED.sort((a, b) =>
      String(b.title || "").localeCompare(String(a.title || ""))
    );

  renderList();
}

// ---------- Editor ----------
async function openEditor(id) {
  setDlgMsg("");
  CURRENT_ID = id;
  const { ok, data } = await apiGetEvent(id);
  if (!ok) {
    setMsg(data?.detail || "Event nicht gefunden.", "error");
    return;
  }
  // Prefill
  document.getElementById("f_title").value = data.title || "";
  document.getElementById("f_eventDate").value = toISODateOnly(
    data.eventDate || data.eventdate
  );
  document.getElementById("f_location").value = data.location || "";
  document.getElementById("f_categoryName").value =
    data.categoryName || data.categoryname || "";
  document.getElementById("f_price").value = data.price ?? 0;
  document.getElementById("f_capacity").value = data.capacity ?? 0;
  document.getElementById("f_description").value = data.description || "";

  const dlg = document.getElementById("editDlg");
  if (typeof dlg.showModal === "function") dlg.showModal();
}

async function saveEditor(e) {
  e?.preventDefault?.();

  if (!CURRENT_ID) return;

  setDlgMsg("Speichere…");
  disableEditor(true);

  const payload = {
    title: document.getElementById("f_title").value.trim(),
    eventDate: document.getElementById("f_eventDate").value,
    location: document.getElementById("f_location").value.trim(),
    price: Number(document.getElementById("f_price").value),
    capacity: parseInt(document.getElementById("f_capacity").value, 10),
    description:
      (document.getElementById("f_description").value || "").trim() || null,
    categoryName:
      (document.getElementById("f_categoryName").value || "").trim() || null,
    // organizerName NICHT mitsenden – kommt aus Session!
  };

  const errors = [];
  if (!payload.title) errors.push("Titel");
  if (!payload.eventDate) errors.push("Datum");
  if (!payload.location) errors.push("Ort");
  if (!Number.isFinite(payload.price) || payload.price < 0)
    errors.push("Preis");
  if (!Number.isInteger(payload.capacity) || payload.capacity < 0)
    errors.push("Kapazität");

  if (errors.length) {
    setDlgMsg("Bitte prüfen: " + errors.join(", "), "error");
    disableEditor(false);
    return;
  }

  const { ok, status, data } = await apiUpdateEvent(CURRENT_ID, payload);
  disableEditor(false);

  if (!ok) {
    setDlgMsg(data?.detail || data?.title || `Fehler (${status})`, "error");
    return;
  }

  // Liste aktualisieren
  const idx = ALL.findIndex((x) => x.id === CURRENT_ID);
  if (idx >= 0) ALL[idx] = data;
  applyFilterAndRender();

  setDlgMsg("Gespeichert ✔", "success");
}

function disableEditor(disabled) {
  document.getElementById("saveBtn").disabled = disabled;
  document.getElementById("delBtn").disabled = disabled;
}

async function confirmDelete(id, title) {
  const sure = window.confirm(
    `Event „${
      title || id
    }“ wirklich löschen? Dies kann nicht rückgängig gemacht werden.`
  );
  if (!sure) return;

  setMsg("Lösche…");
  const { ok, status, data } = await apiDeleteEvent(id);
  if (!ok) {
    setMsg(
      data?.detail || data?.title || `Löschen fehlgeschlagen (${status})`,
      "error"
    );
    return;
  }
  // Erfolgreich (204)
  ALL = ALL.filter((ev) => ev.id !== id);
  applyFilterAndRender();
  setMsg("Event gelöscht.", "success");
}

// ---------- Statistik ----------
const STATS = { currentId: null, lastPayload: null };

function setStatsMsg(text, kind = "") {
  const el = document.getElementById("statsMsg");
  if (!el) return;
  el.textContent = text || "";
  el.className = "msg " + (kind || "");
}

function openStatsDialog() {
  const dlg = document.getElementById("statsDlg");
  if (dlg && typeof dlg.showModal === "function") dlg.showModal();
}

function closeStatsDialog() {
  const dlg = document.getElementById("statsDlg");
  if (dlg) dlg.close();
  setStatsMsg("");
}

function percent(n) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toString();
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderListPairs(el, rows, leftKey, rightKey, rightFmt = (x) => x) {
  el.innerHTML = "";
  if (!Array.isArray(rows) || !rows.length) {
    el.innerHTML = `<p class="muted">Keine Daten.</p>`;
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "inline-list";
  rows.forEach((r) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${r[leftKey]}</span><span class="value">${rightFmt(r[rightKey])}</span>`;
    ul.appendChild(li);
  });
  el.appendChild(ul);
}

function renderRecent(el, recent) {
  el.innerHTML = "";
  if (!Array.isArray(recent) || !recent.length) {
    el.innerHTML = `<p class="muted">Keine Änderungen vorhanden.</p>`;
    return;
  }
  const table = document.createElement("div");
  table.className = "table like-table";
  const head = document.createElement("div");
  head.className = "tr th";
  head.innerHTML = `
    <div>Zeit</div><div>Aktion</div><div>Buchung</div><div>Alt → Neu</div><div>Von</div>
  `;
  table.appendChild(head);
  recent.forEach((r) => {
    const row = document.createElement("div");
    row.className = "tr";
    row.innerHTML = `
      <div>${r.changedAt?.replace("T", " ") ?? ""}</div>
      <div>${r.action}</div>
      <div>#${r.bookingId}</div>
      <div>${r.oldStatus ?? "—"} → ${r.newStatus ?? "—"}</div>
      <div>${r.changedBy ?? ""}</div>
    `;
    table.appendChild(row);
  });
  el.appendChild(table);
}

async function openStats(id) {
  STATS.currentId = id;
  setStatsMsg("Lade Statistik…");
  openStatsDialog();

  const ev = ALL.find((x) => x.id === id);
  const titleEl = document.getElementById("s_title");
  if (titleEl) titleEl.textContent = ev?.title || `Event ${id}`;

  const { ok, status, data } = await apiEventStats(id);
  if (!ok) {
    setStatsMsg(data?.detail || `Fehler beim Laden (${status})`, "error");
    return;
  }
  STATS.lastPayload = data;

  // Event-/Basisdaten
  const cap = Number(data?.event?.capacity ?? ev?.capacity ?? 0);
  const total = Number(data?.stats?.totalBookings ?? 0);
  const remaining = Number(
    data?.stats?.remainingCapacity ?? Math.max(cap - total, 0)
  );
  const usedPct = cap > 0 ? (total / cap) * 100 : 0;

  // KPIs
  const s_total = document.getElementById("s_total");
  const s_remaining = document.getElementById("s_remaining");
  const s_capacity = document.getElementById("s_capacity");
  if (s_total) s_total.textContent = total;
  if (s_remaining) s_remaining.textContent = remaining;
  if (s_capacity) s_capacity.textContent = cap;

  // Balken
  const s_progress = document.getElementById("s_progress");
  const s_used = document.getElementById("s_used");
  const s_cap2 = document.getElementById("s_cap2");
  const s_pct = document.getElementById("s_pct");
  if (s_progress) s_progress.style.width = `${Math.min(100, usedPct)}%`;
  if (s_used) s_used.textContent = total;
  if (s_cap2) s_cap2.textContent = cap;
  if (s_pct) s_pct.textContent = percent(usedPct);

  // Aufschlüsselungen
  const byDateEl = document.getElementById("s_byDate");
  const byStatusEl = document.getElementById("s_byStatus");
  if (byDateEl)
    renderListPairs(byDateEl, data?.stats?.byDate || [], "date", "count", (x) => x);
  if (byStatusEl)
    renderListPairs(byStatusEl, data?.stats?.byStatus || [], "status", "count", (x) => x);

  // Audit
  const recentEl = document.getElementById("s_recent");
  if (recentEl) renderRecent(recentEl, data?.audit?.recent || []);

  setStatsMsg("");
}

async function refreshStats() {
  if (!STATS.currentId) return;
  await openStats(STATS.currentId);
}

// ---------- Bootstrapping ----------
document.addEventListener("DOMContentLoaded", async () => {
  setMsg("Prüfe Login…");

  const me = await fetchMe();
  if (!me) {
    setMsg("Bitte zuerst einloggen. Weiterleitung…", "error");
    setTimeout(() => (window.location.href = "/account"), 900);
    return;
  }
  if (!me.is_organizer) {
    setMsg("Nur Organizer haben Zugriff. Weiterleitung…", "error");
    setTimeout(() => (window.location.href = "/account"), 1100);
    return;
  }

  setMsg("Lade deine Events…");

  const { ok, data, status } = await apiMyEvents();
  if (!ok) {
    setMsg(data?.detail || `Fehler beim Laden (${status})`, "error");
    return;
  }

  // Server liefert {"events":[...]}
  ALL = Array.isArray(data?.events) ? data.events : [];
  applyFilterAndRender();
  setMsg("");

  // UI Events
  document.getElementById("q").addEventListener("input", applyFilterAndRender);
  document.getElementById("sort").addEventListener("change", applyFilterAndRender);
  document.getElementById("reload").addEventListener("click", async () => {
    setMsg("Aktualisiere…");
    const { ok, data } = await apiMyEvents();
    if (ok) {
      ALL = Array.isArray(data?.events) ? data.events : [];
      applyFilterAndRender();
      setMsg("Aktualisiert.", "success");
    } else {
      setMsg(data?.detail || "Fehler beim Aktualisieren", "error");
    }
  });

  // Dialog Events
  document.getElementById("editForm").addEventListener("submit", saveEditor);
  document.getElementById("delBtn").addEventListener("click", async () => {
    if (!CURRENT_ID) return;
    const ev = ALL.find((x) => x.id === CURRENT_ID);
    await confirmDelete(CURRENT_ID, ev?.title);
    closeDialog();
  });
  document.getElementById("cancelBtn").addEventListener("click", closeDialog);
  document.getElementById("closeDlg").addEventListener("click", closeDialog);

  // Statistik-Dialog Events (nur verbinden, wenn das Dialog-HTML existiert)
  const closeStatsBtn = document.getElementById("closeStats");
  const closeStatsFooterBtn = document.getElementById("closeStatsFooter");
  const refreshStatsBtn = document.getElementById("refreshStats");
  const exportStatsBtn = document.getElementById("exportStats");

  if (closeStatsBtn) closeStatsBtn.addEventListener("click", closeStatsDialog);
  if (closeStatsFooterBtn)
    closeStatsFooterBtn.addEventListener("click", closeStatsDialog);
  if (refreshStatsBtn) refreshStatsBtn.addEventListener("click", refreshStats);
  if (exportStatsBtn)
    exportStatsBtn.addEventListener("click", () => {
      if (!STATS.lastPayload) return;
      const ev = ALL.find((x) => x.id === STATS.currentId);
      const safeTitle = (ev?.title || `event-${STATS.currentId}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      downloadJSON(`${safeTitle}-stats.json`, STATS.lastPayload);
    });
});

function closeDialog() {
  const dlg = document.getElementById("editDlg");
  dlg.close();
  setDlgMsg("");
}
