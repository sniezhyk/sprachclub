async function loadBookings() {
  const container = document.getElementById("bookings-grid");
  if (!container) return;

  try {
    const res = await fetch("/booking");
    if (!res.ok) {
      throw new Error("Failed to load bookings");
    }
    const data = await res.json();
    renderBookings(data.items || []);
  } catch (err) {
    console.error("Error loading bookings:", err);
    container.innerHTML = "<p>Failed to load bookings.</p>";
  }
}

function renderBookings(bookings) {
  const container = document.getElementById("bookings-grid");
  if (!container) return;

  container.innerHTML = "";
  if (!bookings || bookings.length === 0) {
    container.innerHTML = "<p>No bookings yet.</p>";
    return;
  }

  bookings.forEach(b => {
  const card = document.createElement("div");
  card.className = "booking-card";
  card.id = "booking-" + b.id;
  card.innerHTML = `
    <div class="booking-info">
      <div class="event-title">${b.title}</div>
      <div class="event-date">📅 ${b.eventDate}</div>
      <div class="event-location">📍 ${b.location}</div>
      <div class="status">Status: ${b.status}</div>
      <button class="cancel-btn" onclick="cancelBooking(${b.id})">❌ Cancel</button>
    </div>
  `;
  container.appendChild(card);
});
}


async function cancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;

  try {
    console.log("Sending DELETE for id:", bookingId);
    const res = await fetch("/booking/", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bookingId })
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Error: " + (err.error || res.statusText));
      return;
    }
    const card = document.getElementById("booking-" + bookingId);
    if (card) card.remove();

    alert("Booking cancelled.");
  } catch (err) {
    console.error("Cancel failed", err);
    alert("Cancel failed. Try again later.");
  }
}


document.addEventListener("DOMContentLoaded", loadBookings);
