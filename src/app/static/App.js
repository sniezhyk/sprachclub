// static/App.js
// Minimal interaktives Frontend – ohne Libraries

// API-Endpunkte
const API = {
  clubs: (params) => `/api/clubs?${new URLSearchParams(params)}`,
  enroll: () => `/api/enrollments`,
  login: () => `/api/auth/login`,
  register: () => `/api/auth/register`,
  me: () => `/api/auth/me`,
  logout: () => `/api/auth/logout`,
};

// ----- Utilities -----
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}

function euro(cents) { return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' }); }

// ----- Fehler-Helfer (Forms) -----
function clearFormErrors(form) {
  form.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
  form.querySelectorAll('.error-msg').forEach(e => { e.textContent = ''; e.hidden = true; });
  const box = form.querySelector('.error-summary');
  if (box) { box.innerHTML = ''; box.hidden = true; }
}

function setFieldError(form, name, message) {
  const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
  const fieldWrap = input?.closest('.field');
  if (fieldWrap) {
    fieldWrap.classList.add('invalid');
    const msg = fieldWrap.querySelector('.error-msg');
    if (msg) { msg.textContent = message; msg.hidden = false; }
  }
}

function showErrorSummary(form, messages = []) {
  const box = form.querySelector('.error-summary');
  if (!box) return;
  const list = messages.map(m => `<li>${m}</li>`).join('');
  box.innerHTML = `<strong>Bitte prüfen:</strong><ul>${list}</ul>`;
  box.hidden = false;
  box.focus?.();
}

// ----- Session-State -----
let currentUser = null;

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = data?.error || `Fehler ${res.status}`;
    const field = data?.field || null;
    const error = Object.assign(new Error(msg), { status: res.status, data, field });
    throw error;
  }
  return data;
}

// ----- Navigation dynamisch rendern -----
function renderLoggedOutNav() {
  const right = $('#nav-right');
  right.innerHTML = `
    <button id="open-auth" class="btn btn-link" aria-haspopup="dialog">Anmelden</button>
    <a href="#register" class="btn btn-solid" id="open-register">Registrieren</a>
  `;
  $('#open-auth').addEventListener('click', openAuthDialog);
  $('#open-register').addEventListener('click', () => openAuthDialog('register'));
}

function renderLoggedInNav() {
  const right = $('#nav-right');
  right.innerHTML = `
    <div class="menu" data-menu>
      <button id="account-toggle" class="btn btn-link" aria-haspopup="true" aria-expanded="false" aria-controls="account-menu">
        Mein Konto
      </button>
      <ul id="account-menu" class="dropdown" role="menu" aria-labelledby="account-toggle" hidden>
        <li role="none"><a role="menuitem" class="dropdown-item" href="/my-account#profile">Meine Daten</a></li>
        <li role="none"><a role="menuitem" class="dropdown-item" href="/my-account#orders">Meine Bestellungen</a></li>
        <li role="none"><a role="menuitem" class="dropdown-item" href="/my-account#invoices">Meine Rechnungen</a></li>
      </ul>
    </div>
    <button id="logout-btn" class="btn btn-solid btn-danger" title="Abmelden">Logout</button>
  `;

  // Dropdown
  const toggle = $('#account-toggle');
  const menu = $('#account-menu');
  const closeAll = () => { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', (e) => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.hidden = expanded;
    if (!expanded) menu.querySelector('.dropdown-item')?.focus();
    e.stopPropagation();
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('[data-menu]')) closeAll(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  // Logout
  $('#logout-btn').addEventListener('click', async () => {
    try {
      await fetchJSON(API.logout(), { method: 'POST' });
      currentUser = null;
      renderLoggedOutNav();
      toast('Abgemeldet.');
    } catch (err) {
      toast(err.message || 'Logout fehlgeschlagen.');
    }
  });
}

function applyNav() { currentUser ? renderLoggedInNav() : renderLoggedOutNav(); }

// ----- Clubs Rendering -----
function renderClubs(items = []) {
  const list = $('#club-list');
  const empty = $('#empty');
  list.innerHTML = '';
  if (!items.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  for (const it of items) {
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `
      <h3>${it.title}</h3>
      <p class="muted">${it.description ?? ''}</p>
      <div class="meta">
        <span class="tag">${it.level_code}</span>
        <span>${formatDateTime(it.starts_at)}</span>
        <span>${it.duration_min} Min</span>
        <span>${it.capacity - (it.confirmed_count ?? 0)} Plätze frei</span>
        <span>${euro(it.price_cents ?? 0)}</span>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" data-action="details">Details</button>
        <button class="btn" data-action="book">Buchen</button>
      </div>`;
    li.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'details') openDetails(it);
      if (action === 'book') book(it);
    });
    list.appendChild(li);
  }
}

function openDetails(it) {
  $('#d-title').textContent = it.title;
  $('#d-desc').textContent = it.description ?? '';
  $('#d-level').textContent = it.level_code;
  $('#d-when').textContent = formatDateTime(it.starts_at);
  $('#d-capacity').textContent = `${it.capacity - (it.confirmed_count ?? 0)} Plätze frei`;
  $('#d-price').textContent = euro(it.price_cents ?? 0);
  $('#book-now').onclick = () => book(it);
  $('#details').showModal();
}

// Dummy book
function book(it) {
  if (!currentUser) {
    toast('Bitte zuerst anmelden.');
    openAuthDialog('login');
    return;
  }
  toast(`Buchung gestartet: ${it.title}`);
}

// ----- Auth-Dialog & Form-Handling -----
function openAuthDialog(tab = 'login') {
  const dlg = $('#auth');
  if (tab === 'register') {
    $('#tab-register').setAttribute('aria-selected', 'true');
    $('#panel-register').hidden = false;
    $('#tab-login').setAttribute('aria-selected', 'false');
    $('#panel-login').hidden = true;
  } else {
    $('#tab-login').setAttribute('aria-selected', 'true');
    $('#panel-login').hidden = false;
    $('#tab-register').setAttribute('aria-selected', 'false');
    $('#panel-register').hidden = true;
  }
  dlg.showModal();
}
function closeAuthDialog() { $('#auth').close(); }

function setupAuthTabs() {
  $('#tab-login').addEventListener('click', () => openAuthDialog('login'));
  $('#tab-register').addEventListener('click', () => openAuthDialog('register'));
  $$('.close-auth').forEach(b => b.addEventListener('click', closeAuthDialog));

  // Inputs: Fehler beim Tippen zurücksetzen
  document.querySelectorAll('#auth input').forEach(inp => {
    inp.addEventListener('input', () => {
      const field = inp.closest('.field');
      if (field?.classList.contains('invalid')) {
        field.classList.remove('invalid');
        const msg = field.querySelector('.error-msg'); if (msg) { msg.textContent=''; msg.hidden=true; }
      }
      const form = inp.closest('form');
      form?.querySelector('.error-summary')?.setAttribute('hidden', 'hidden');
    });
  });

  // LOGIN
  $('#panel-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    clearFormErrors(form);

    const fd = new FormData(form);
    const identifier = (fd.get('email') || '').trim(); // E-Mail ODER Username
    const password = (fd.get('password') || '').trim();

    const errors = [];
    if (!identifier) { errors.push('Bitte E-Mail oder Nutzernamen eingeben.'); setFieldError(form, 'email', 'Pflichtfeld'); }
    if (!password)   { errors.push('Bitte Passwort eingeben.');              setFieldError(form, 'password', 'Pflichtfeld'); }
    if (errors.length) { showErrorSummary(form, errors); return; }

    try {
      const data = await fetchJSON(API.login(), {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      currentUser = data?.user || null;
      applyNav();
      closeAuthDialog();
      toast(`Willkommen, ${currentUser?.first_name || currentUser?.username || 'User'}!`);
    } catch (err) {
      // Backend liefert evtl. field
      if (err.field) setFieldError(form, err.field, err.message);
      showErrorSummary(form, [err.message]);
    }
  });

  // Live-Validierung: Passwort = Wiederholung
  const pw1 = document.querySelector('#panel-register input[name="password"]');
  const pw2 = document.querySelector('#panel-register input[name="password_repeat"]');
  const ensurePwMatch = () => {
    if (!pw1 || !pw2) return;
    if (pw2.value && pw1.value !== pw2.value) {
      pw2.setCustomValidity('Passwörter stimmen nicht überein');
    } else {
      pw2.setCustomValidity('');
    }
  };
  pw1?.addEventListener('input', ensurePwMatch);
  pw2?.addEventListener('input', ensurePwMatch);

  // REGISTER
  $('#panel-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    clearFormErrors(form);

    const fd = new FormData(form);
    // Pflichtfelder
    const first_name = (fd.get('first_name') || '').trim();
    const last_name  = (fd.get('last_name')  || '').trim();
    const username   = (fd.get('username')   || '').trim();
    const email      = (fd.get('email')      || '').trim();
    const password   = (fd.get('password')   || '');
    const password_repeat = (fd.get('password_repeat') || '');
    const tos        = fd.get('tos') === 'on';

    const errors = [];
    if (!first_name) { setFieldError(form, 'first_name', 'Pflichtfeld'); errors.push('Vorname fehlt.'); }
    if (!last_name)  { setFieldError(form, 'last_name',  'Pflichtfeld'); errors.push('Nachname fehlt.'); }
    if (!username)   { setFieldError(form, 'username',   'Pflichtfeld'); errors.push('Nutzername fehlt.'); }
    if (!email)      { setFieldError(form, 'email',      'Pflichtfeld'); errors.push('E-Mail fehlt.'); }
    if (!password)   { setFieldError(form, 'password',   'Pflichtfeld'); errors.push('Passwort fehlt.'); }
    if (!password_repeat) { setFieldError(form, 'password_repeat', 'Bitte wiederholen'); errors.push('Passwort wiederholen.'); }
    if (password && password.length < 8) {
      setFieldError(form, 'password', 'Mindestens 8 Zeichen');
      errors.push('Passwort ist zu kurz (min. 8 Zeichen).');
    }
    if (password && password_repeat && password !== password_repeat) {
      setFieldError(form, 'password_repeat', 'Passwörter stimmen nicht überein');
      errors.push('Passwörter stimmen nicht überein.');
    }
    if (!tos) { errors.push('Bitte AGB akzeptieren.'); }

    // Optional
    const birth_date = (fd.get('birth_date') || '').trim();

    if (errors.length) { showErrorSummary(form, errors); return; }

    const payload = {
      username,
      email,
      first_name,
      last_name,
      password,
      birth_date: birth_date || undefined,
      tos: true
    };

    try {
      const data = await fetchJSON(API.register(), {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      currentUser = data || null; // created_user_payload -> { ...user }
      applyNav();
      closeAuthDialog();
      toast('Registrierung erfolgreich. Willkommen!');
    } catch (err) {
      // Mappt Backend-Feldfehler (z. B. 409 "Username bereits vergeben.", field:"username")
      if (err.field) setFieldError(form, err.field, err.message);
      showErrorSummary(form, [err.message]);
    }
  });
}

// ----- Session beim Laden prüfen -----
async function bootstrapSession() {
  try {
    const data = await fetchJSON(API.me(), { method: 'GET' });
    currentUser = data?.user || null;
  } catch { currentUser = null; }
  applyNav();
}

// ----- Filter-Form -----
function setupFilters() {
  const form = $('#filter-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // const params = Object.fromEntries(new FormData(form).entries());
    // const data = await fetchJSON(API.clubs(params));
    // renderClubs(data.items || []);
    toast('Suche aktualisiert (Demo).');
  });
}

// ----- Details-Dialog schließen -----
function setupDetailsDialog() {
  $('#close-details')?.addEventListener('click', () => $('#details').close());
}

// ----- Menü „Hilfe“ Dropdown -----
function setupHelpMenu() {
  const toggle = $('#help-toggle');
  const menu = $('#help-menu');
  if (!toggle || !menu) return;

  const close = () => { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', (e) => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.hidden = expanded;
    e.stopPropagation();
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('#help-toggle')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

// ----- Init -----
window.addEventListener('DOMContentLoaded', () => {
  setupAuthTabs();
  setupFilters();
  setupDetailsDialog();
  setupHelpMenu();
  bootstrapSession();
});

// Jahr für Foother
const startYear = 2022;
  const currentYear = new Date().getFullYear();
  document.getElementById("copyright-year").textContent =
    currentYear > startYear ? `${startYear} - ${currentYear}` : startYear;
