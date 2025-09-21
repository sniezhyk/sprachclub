function getEventIdFromUrl() {
  const params = new URLSearchParams(location.search);
  return parseInt(params.get("id"), 10);
}

function renderEventDetails() {
  const allEvents = JSON.parse(localStorage.getItem("allEvents")) || [];
  const eventId = getEventIdFromUrl();
  const ev = allEvents.find((e) => e.id === eventId);

  if (!ev) {
    document.getElementById("event-details").innerHTML =
      "<p>Event not found.</p>";
    return;
  }

  document.getElementById("event-details").innerHTML = `
    <h1>${ev.title}</h1>
    <img src="${
      ev.img || "https://via.placeholder.com/600x300?text=Event"
    }" alt="${ev.title}">
    <p>${ev.description || ""}</p>
  `;

  renderReviews(eventId);
}

function renderReviews(eventId) {
  const reviews = JSON.parse(localStorage.getItem("reviews")) || {};
  const eventReviews = reviews[eventId] || [];
  const container = document.getElementById("reviews");

  container.innerHTML = eventReviews.length
    ? eventReviews
        .map((r) => `<p>📝 ${r.text} <small>(${r.date})</small></p>`)
        .join("")
    : "<p>No reviews yet.</p>";
}

document.getElementById("review-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = document.getElementById("review-text").value.trim();
  if (!text) return;

  const eventId = getEventIdFromUrl();
  const reviews = JSON.parse(localStorage.getItem("reviews")) || {};
  if (!reviews[eventId]) reviews[eventId] = [];

  reviews[eventId].push({ text, date: new Date().toLocaleString() });

  localStorage.setItem("reviews", JSON.stringify(reviews));

  document.getElementById("review-text").value = "";
  renderReviews(eventId);
});

renderEventDetails();
