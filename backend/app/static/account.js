// static/account.js
// „Mein Konto“ – Profil bearbeiten, Passwort ändern, Konto löschen

const $$ = (sel, root = document) => [...(root || document).querySelectorAll(sel)];
const $  = (sel, root = document) => (root || document).querySelector(sel);

function showToast(msg) { (window.toast || ((m)=>alert(m)))(msg); }

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
    throw Object.assign(new Error(msg), { status: res.status, data, field });
  }
  return data;
}

// Errors
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
  box.innerHTML = `<strong>Bitte prüfen:</strong><ul>${messages.map(m => `<li>${m}</li>`).join('')}</ul>`;
  box.hidden = false;
  box.focus?.();
}

// Tabs
function setupTabs() {
  const tabs = $$('.tabs .tab-btn');
  const panels = [$('#panel-profile'), $('#panel-password'), $('#panel-danger')];
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.setAttribute('aria-selected', 'false'));
      panels.forEach(p => p.hidden = true);
      btn.setAttribute('aria-selected', 'true');
      const id = btn.getAttribute('aria-controls');
      document.getElementById(id).hidden = false;
      document.getElementById(id).querySelector('input')?.focus();
    });
  });
}

// Load profile
let originalEmail = '';

async function loadProfile() {
  try {
    const me = await fetchJSON('/api/auth/me', { method: 'GET' });
    const user = me?.user;
    if (!user) throw new Error('Nicht angemeldet');

    const pf = $('#panel-profile');
    pf.first_name.value = user.first_name || '';
    pf.last_name.value  = user.last_name  || '';
    pf.email.value      = user.email      || '';
    pf.birth_date.value = user.birth_date ? user.birth_date.slice(0,10) : '';

    originalEmail = user.email || '';

    $('#account-content').hidden = false;
    $('#account-guard').hidden = true;
  } catch {
    $('#account-content').hidden = true;
    $('#account-guard').hidden = false;
  }
}

// Profile submit
function setupProfileForm() {
  const form = $('#panel-profile');
  form.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const field = inp.closest('.field');
      if (field?.classList.contains('invalid')) {
        field.classList.remove('invalid');
        const msg = field.querySelector('.error-msg'); if (msg) { msg.textContent=''; msg.hidden=true; }
      }
      form.querySelector('.error-summary')?.setAttribute('hidden', 'hidden');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const first_name = form.first_name.value.trim();
    const last_name  = form.last_name.value.trim();
    const email      = form.email.value.trim();
    const birth_date = form.birth_date.value.trim();
    const current_password_email = form.current_password_email.value;

    const errs = [];
    if (!first_name) { setFieldError(form, 'first_name', 'Pflichtfeld'); errs.push('Vorname fehlt.'); }
    if (!last_name)  { setFieldError(form, 'last_name',  'Pflichtfeld'); errs.push('Nachname fehlt.'); }
    if (!email)      { setFieldError(form, 'email',      'Pflichtfeld'); errs.push('E-Mail fehlt.'); }

    const emailChanged = email && email !== originalEmail;
    if (emailChanged && !current_password_email) {
      setFieldError(form, 'current_password_email', 'Bitte aktuelles Passwort eingeben.');
      errs.push('Für die E-Mail-Änderung ist dein aktuelles Passwort erforderlich.');
    }
    if (errs.length) { showErrorSummary(form, errs); return; }

    const payload = { first_name, last_name, email, birth_date: birth_date || null };
    if (emailChanged) payload.current_password = current_password_email;

    try {
      await fetchJSON('/api/auth/me', { method: 'PATCH', body: JSON.stringify(payload) });
      if (emailChanged) originalEmail = email;
      form.current_password_email.value = '';
      showToast('Profil gespeichert.');
    } catch (err) {
      if (err.field) setFieldError(form, err.field, err.message);
      showErrorSummary(form, [err.message]);
    }
  });
}

// Password form
function setupPasswordForm() {
  const form = $('#panel-password');

  const pw1 = form.new_password;
  const pw2 = form.new_password_repeat;
  const sync = () => { pw2.setCustomValidity(pw2.value && pw1.value !== pw2.value ? 'Passwörter stimmen nicht überein' : ''); };
  pw1.addEventListener('input', sync);
  pw2.addEventListener('input', sync);

  form.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const field = inp.closest('.field');
      if (field?.classList.contains('invalid')) {
        field.classList.remove('invalid');
        const msg = field.querySelector('.error-msg'); if (msg) { msg.textContent=''; msg.hidden=true; }
      }
      form.querySelector('.error-summary')?.setAttribute('hidden', 'hidden');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const current_password = form.current_password.value || '';
    const new_password     = form.new_password.value || '';
    const new_password_repeat = form.new_password_repeat.value || '';

    const errs = [];
    if (!current_password) { setFieldError(form, 'current_password', 'Pflichtfeld'); errs.push('Aktuelles Passwort fehlt.'); }
    if (!new_password)     { setFieldError(form, 'new_password', 'Pflichtfeld'); errs.push('Neues Passwort fehlt.'); }
    if (new_password && new_password.length < 8) {
      setFieldError(form, 'new_password', 'Mindestens 8 Zeichen'); errs.push('Neues Passwort zu kurz.');
    }
    if (new_password && new_password_repeat && new_password !== new_password_repeat) {
      setFieldError(form, 'new_password_repeat', 'Passwörter stimmen nicht überein'); errs.push('Passwörter stimmen nicht überein.');
    }
    if (errs.length) { showErrorSummary(form, errs); return; }

    try {
      await fetchJSON('/api/auth/password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) });
      form.reset();
      showToast('Passwort aktualisiert.');
    } catch (err) {
      if (err.field) setFieldError(form, err.field, err.message);
      showErrorSummary(form, [err.message]);
    }
  });
}

// Delete flow
function setupDeleteFlow() {
  const dlg = $('#delete-dialog');
  const openBtn = $('#open-delete');
  const chk = $('#delete-confirm-check');
  const pwd = $('#delete-password');
  const confirmBtn = $('#delete-confirm');
  const cancelBtn = $('#delete-cancel');

  const updateConfirmBtn = () => { confirmBtn.disabled = !(chk.checked && pwd.value.length > 0); };

  openBtn?.addEventListener('click', () => {
    chk.checked = false;
    pwd.value = '';
    pwd.closest('.field')?.classList.remove('invalid');
    const em = pwd.closest('.field')?.querySelector('.error-msg'); if (em) { em.textContent=''; em.hidden=true; }
    updateConfirmBtn();
    dlg.showModal();
  });

  chk?.addEventListener('change', updateConfirmBtn);
  pwd?.addEventListener('input', updateConfirmBtn);
  cancelBtn?.addEventListener('click', () => dlg.close());

  confirmBtn?.addEventListener('click', async () => {
    if (confirmBtn.disabled) return;
    try {
      await fetchJSON('/api/auth/me', { method: 'DELETE', body: JSON.stringify({ current_password: pwd.value }) });
      dlg.close();
      showToast('Konto gelöscht.');
      window.location.href = '/';
    } catch (err) {
      const field = pwd.closest('.field');
      field?.classList.add('invalid');
      const msg = field?.querySelector('.error-msg');
      if (msg) { msg.textContent = err.message || 'Löschen fehlgeschlagen.'; msg.hidden = false; }
    }
  });
}

// Help menu + Guard login button
function setupHeaderBits() {
  // Hilfe-Menü (gleich wie Startseite)
  const toggle = $('#help-toggle');
  const menu = $('#help-menu');
  if (toggle && menu) {
    const close = () => { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', (e) => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.hidden = expanded;
      if (!expanded) menu.querySelector('.dropdown-item')?.focus();
      e.stopPropagation();
    });
    document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('#help-toggle')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // „Jetzt anmelden“-Button (falls nicht eingeloggt)
  $('#guard-login-btn')?.addEventListener('click', () => {
    if (typeof window.openAuthDialog === 'function') {
      window.openAuthDialog('login');
    } else {
      window.location.href = '/';
    }
  });
}

// Boot
window.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupProfileForm();
  setupPasswordForm();
  setupDeleteFlow();
  setupHeaderBits();
  await loadProfile();
});
