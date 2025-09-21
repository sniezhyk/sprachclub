// static/login.js
document.addEventListener("DOMContentLoaded", () => {
  // alert("CR: ihr seid wieder zu spät zu eurem Termin mit Josua :)");
  // alert("CR: in account.py und anderswo verletzt ihr Separation of Concerns");
  console.warn("CR hint: Separation of Concerns in account.py, etc.");

  const accountPic = document.getElementById("account-pic");
  const accountLink = document.getElementById("account-link"); // <a id="account-link">Account</a>

  const loginModal = document.getElementById("login-modal");
  const closeLoginBtn = document.getElementById("close-login");

  const showLoginBtn = document.getElementById("show-login");
  const showRegisterBtn = document.getElementById("show-register");
  const loginFormBox = document.getElementById("login-form");
  const registerFormBox = document.getElementById("register-form");

  // ---------- UI Helpers ----------
  function openLoginModal() {
    if (!loginModal) return;
    loginModal.classList.remove("hidden");
    loginFormBox?.classList.remove("hidden");
    registerFormBox?.classList.add("hidden");
    showLoginBtn?.classList.add("active");
    showRegisterBtn?.classList.remove("active");
  }
  function closeLoginModal() {
    loginModal?.classList.add("hidden");
  }

  // ---------- Session-Check: Account oder Modal ----------
  async function goToAccountOrOpenModal(evt) {
    if (evt) evt.preventDefault();
    try {
      const res = await fetch("/account/data", { credentials: "include" });
      console.log(res);
      if (res.ok) {
        // bereits eingeloggt → direkt zur Account-Seite
        window.location.href = "/account.html";
        return;
      }
    } catch (_) {
      /* Netzwerkfehler: Modal als Fallback */
    }
    // nicht eingeloggt → Modal öffnen
    openLoginModal();
  }

  // Klicks abfangen
  accountPic?.addEventListener("click", goToAccountOrOpenModal);
  accountLink?.addEventListener("click", goToAccountOrOpenModal);

  // ---------- Modal-UI ----------
  closeLoginBtn?.addEventListener("click", closeLoginModal);

  loginModal?.addEventListener("click", (e) => {
    if (e.target === loginModal) closeLoginModal();
  });

  showLoginBtn?.addEventListener("click", () => {
    loginFormBox?.classList.remove("hidden");
    registerFormBox?.classList.add("hidden");
    showLoginBtn?.classList.add("active");
    showRegisterBtn?.classList.remove("active");
  });

  showRegisterBtn?.addEventListener("click", () => {
    registerFormBox?.classList.remove("hidden");
    loginFormBox?.classList.add("hidden");
    showRegisterBtn?.classList.add("active");
    showLoginBtn?.classList.remove("active");
  });

  // ---------- Form-Handling ----------
  async function apiPost(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // wichtig: Session-Cookie
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { ok: res.ok, status: res.status, data };
  }

  async function finishAuthFlow(apiResult) {
    if (!apiResult.ok) {
      const msg =
        apiResult?.data?.detail ||
        apiResult?.data?.message ||
        "Fehler beim Login/der Registrierung";
      alert(msg);
      return;
    }
    // sanity check: Session prüfen
    const check = await fetch("/account/data", { credentials: "include" });
    if (check.ok) {
      closeLoginModal();
      window.location.href = "/account.html";
    } else {
      alert(
        "Login/Registration erfolgreich, aber Session nicht gefunden. Bitte erneut versuchen."
      );
    }
  }

  function bindForm(form, endpoint) {
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = {};
      form.querySelectorAll("input, select, textarea").forEach((input) => {
        if (input.name) formData[input.name] = input.value.trim();
      });
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const result = await apiPost(endpoint, formData);
        await finishAuthFlow(result);
      } catch (err) {
        console.error(err);
        alert("Netzwerkfehler");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Binden
  bindForm(document.getElementById("login-form"), "/account/login");
  bindForm(document.getElementById("register-form"), "/account/");
});
