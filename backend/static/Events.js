let events = [];
let organizers = [];
let wishlist = [];
let wishlistIds = new Set();
let subscriptions = JSON.parse(localStorage.getItem("subscriptions")) || [];
let myBookings = {};
try { myBookings = JSON.parse(localStorage.getItem("myBookings") || "{}"); } catch (_) { myBookings = {}; }

function isBooked(eventId) { return !!myBookings[String(eventId)]; }
function getBookingId(eventId) { return myBookings[String(eventId)]; }
function setBookingForEvent(eventId, bookingId) { myBookings[String(eventId)] = Number(bookingId); localStorage.setItem("myBookings", JSON.stringify(myBookings)); }
function removeBookingForEvent(eventId) { delete myBookings[String(eventId)]; localStorage.setItem("myBookings", JSON.stringify(myBookings)); }

async function bookEvent(eventId) {
  try {
    const res = await fetch("/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId }) });
    if (!res.ok) { let msg = res.statusText; try { const err = await res.json(); msg = err.error || msg; } catch {} alert("Error: " + msg); return; }
    const booking = await res.json();
    const bookingId = Number((booking && (booking.id ?? booking.bookingId)));
    if (Number.isFinite(bookingId)) { setBookingForEvent(eventId, bookingId); }
    alert("✅ Event booked successfully!");
    renderEvents();
  } catch (err) { console.error("Booking failed", err); alert("Booking failed. Try again later."); }
}

async function cancelBooking(eventId) {
  const bookingId = getBookingId(eventId);
  if (!bookingId) { alert("Booking ID not found for this event. Cannot cancel."); return; }
  try {
    const res = await fetch("/booking", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bookingId }) });
    if (!res.ok) { let msg = res.statusText; try { const err = await res.json(); msg = err.error || msg; } catch {} alert("Error canceling booking: " + msg); return; }
    removeBookingForEvent(eventId);
    alert("🗑️ Booking canceled.");
    renderEvents();
  } catch (err) { console.error("Cancel failed", err); alert("Cancel failed. Try again later."); }
}

async function preloadWishlistIds() {
  try {
    const res = await fetch("/eventdata/wishlist");
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data && data.events) ? data.events : [];
    wishlistIds = new Set(list.map(e => e.id));
  } catch (_) {}
}

async function loadEvents() {
  const container = document.getElementById("events-grid");
  if (!container) return;
  try {
    const qs = new URLSearchParams(location.search);
    const currentCategory = qs.get("category") || "";
    const url = currentCategory ? `/eventdata?category=${encodeURIComponent(currentCategory)}` : `/eventdata`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load events");
    const data = await res.json();
    events = Array.isArray(data && data.events) ? data.events : Array.isArray(data && data.items) ? data.items : Array.isArray(data) ? data : [];
    if (currentCategory) {
      const norm = function(s){ return String(s||"").toLowerCase(); };
      events = events.filter(function(e){ return norm(e.categoryName || e.category || e.categoryname) === norm(currentCategory); });
    }
    localStorage.setItem("allEvents", JSON.stringify(events));
    renderEvents();
  } catch (err) { console.error("Error loading events:", err); container.innerHTML = "<p>Failed to load events.</p>"; }
}

function renderEvents() {
  const container = document.getElementById("events-grid");
  if (!container) return;
  container.innerHTML = "";
  if (!events || events.length === 0) { container.innerHTML = "<p>No events available.</p>"; return; }
  const qs = new URLSearchParams(location.search);
  const isWishlistView = qs.get("wishlist") === "1";

  events.forEach(function(ev) {
    const card = document.createElement("div");
    card.className = "event-card";
    const imgUrl = ev.imageUrl || ev.img || "https://via.placeholder.com/400x200?text=Event";
    const booked = isBooked(ev.id);
    const inWish = wishlistIds.has(ev.id);

    const bookingBtnHtml = booked
      ? `<button class="cancel-btn" onclick="cancelBooking(${ev.id}); event.stopPropagation();">❌ Cancel</button>`
      : `<button class="booking-btn" onclick="bookEvent(${ev.id}); event.stopPropagation();">📅 Book</button>`;

    const wishBtnHtml = inWish
      ? `<button class="wishlist-btn remove" onclick="removeFromWishlist(${ev.id}); event.stopPropagation();">🗑️ Remove from Wishlist</button>`
      : `<button class="wishlist-btn" onclick="addToWishlist(${ev.id}); event.stopPropagation();">💖 Add to Wishlist</button>`;

    card.innerHTML = `
      <img src="${imgUrl}" alt="${ev.title || "Event"}">
      <div class="event-info">
        <div class="event-title">${ev.title || ""}</div>
        <div class="event-description">${ev.description || ""}</div>
        ${wishBtnHtml}
        ${bookingBtnHtml}
      </div>
    `;
    card.addEventListener("click", function() { window.open("event.html?id=" + ev.id, "_blank"); });
    container.appendChild(card);
  });
}

function renderOrganizers() {
  const container = document.getElementById("organizers-grid");
  if (!container) return;
  container.innerHTML = "";
  if (!organizers || organizers.length === 0) { container.innerHTML = "<p>No organizers available.</p>"; return; }
  organizers.forEach(function(org){
    const card = document.createElement("div");
    card.className = "organizer-card";
    const isSubscribed = subscriptions.some(function(o){ return o.id === org.id; });
    card.innerHTML = `
      <div class="organizer-info">
        <div class="organizer-name">${org.name}</div>
        <div class="organizer-description">${org.description || ""}</div>
        <button class="subscribe-btn" onclick="toggleSubscription(${org.id})">${isSubscribed ? "✅ Subscribed" : "🔔 Subscribe"}</button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function loadWishlistFromServer() {
  const container = document.getElementById("events-grid");
  if (!container) return;
  try {
    const res = await fetch("/eventdata/wishlist");
    if (!res.ok) throw new Error("Failed to load wishlist");
    const data = await res.json();
    wishlist = Array.isArray(data && data.events) ? data.events : [];
    wishlistIds = new Set(wishlist.map(e => e.id));
    renderWishlist();
  } catch (err) { console.error("Error loading wishlist:", err); container.innerHTML = "<p>Failed to load wishlist.</p>"; }
}

function renderWishlist() {
  const container = document.getElementById("events-grid");
  if (!container) return;
  container.innerHTML = "";
  if (!wishlist || wishlist.length === 0) { container.innerHTML = "<p>Your wishlist is empty.</p>"; return; }
  wishlist.forEach(function(ev){
    const card = document.createElement("div");
    card.className = "event-card";
    const imgUrl = ev.imageUrl || ev.img || "https://via.placeholder.com/400x200?text=Event";
    card.innerHTML = `
      <img src="${imgUrl}" alt="${ev.title || "Event"}">
      <div class="event-info">
        <div class="event-title">${ev.title || ""}</div>
        <div class="event-description">${ev.description || ""}</div>
        <button class="wishlist-btn remove" onclick="removeFromWishlist(${ev.id}); event.stopPropagation();">🗑️ Remove from Wishlist</button>
      </div>
    `;
    card.addEventListener("click", function() { window.open("event.html?id=" + ev.id, "_blank"); });
    container.appendChild(card);
  });
}

async function addToWishlist(eventId) {
  try {
    const res = await fetch("/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId }) });
    if (!res.ok) { let msg = res.statusText; try { const err = await res.json(); msg = err.error || msg; } catch {} alert("Wishlist-Fehler: " + msg); return; }
    wishlistIds.add(eventId);
    const qs = new URLSearchParams(location.search);
    if (qs.get("wishlist") === "1") { await loadWishlistFromServer(); } else { renderEvents(); }
  } catch (err) { console.error("Wishlist POST failed", err); alert("Wishlist speichern fehlgeschlagen."); }
}

// Replace previous removeFromWishlist(eventId) with this:
async function removeFromWishlist(eventId) {
  try {
    const res = await fetch("/wishlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId })
    });

    if (!res.ok) {
      // Server kann 4xx/5xx + evtl. JSON-Fehler liefern
      let msg = res.statusText;
      try { const err = await res.json(); msg = err.error || msg; } catch {}
      alert("Wishlist-Fehler: " + msg);
      return;
    }

    wishlistIds.delete(eventId);

    // Wenn wir uns in der Wishlist-Ansicht befinden, neu laden; sonst Events neu rendern
    const qs = new URLSearchParams(location.search);
    if (qs.get("wishlist") === "1") {
      await loadWishlistFromServer();
    } else {
      renderEvents();
    }
  } catch (err) {
    console.error("Wishlist DELETE failed", err);
    alert("Wishlist entfernen fehlgeschlagen.");
  }
}


function toggleSubscription(orgId) {
  const organizer = organizers.find(function(o){ return o.id === orgId; });
  if (!organizer) return;
  const index = subscriptions.findIndex(function(o){ return o.id === orgId; });
  if (index === -1) { subscriptions.push(organizer); alert("Subscribed to " + organizer.name); } else { subscriptions.splice(index, 1); alert("Unsubscribed from " + organizer.name); }
  localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
  renderOrganizers();
}

document.addEventListener("DOMContentLoaded", async function() {
  const qs = new URLSearchParams(location.search);
  const wishlistParam = qs.get("wishlist") === "1";
  const eventsContainer = document.getElementById("events-grid");
  const organizersContainer = document.getElementById("organizers-grid");
  await preloadWishlistIds();
  if (wishlistParam && eventsContainer) { const h1 = document.querySelector("h1"); if (h1) h1.textContent = "My Wishlist"; await loadWishlistFromServer(); }
  else { if (eventsContainer) loadEvents(); if (organizersContainer) renderOrganizers(); }
  const sel = document.getElementById("category");
  if (sel) { sel.value = qs.get("category") || ""; sel.addEventListener("change", function(e) { const v = e.target.value || ""; const qs2 = new URLSearchParams(location.search); if (v) qs2.set("category", v); else qs2.delete("category"); location.search = qs2.toString(); }); }
  const wishlistLink = document.getElementById("wishlist-link");
  if (wishlistLink && eventsContainer) { wishlistLink.addEventListener("click", async function(e) { e.preventDefault(); const h1 = document.querySelector("h1"); if (h1) h1.textContent = "My Wishlist"; await loadWishlistFromServer(); }); }
});
