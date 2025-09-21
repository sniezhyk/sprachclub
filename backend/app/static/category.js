document.addEventListener("DOMContentLoaded", () => {
  const selectEl = document.getElementById("categories");
  const slider   = document.getElementById("event-slider");
  if (!selectEl || !slider) return;

  function renderEventsToSlider(container, items) {
    container.innerHTML = "";
    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="event">
          <div class="event-content">
            <div class="event-title">No results</div>
            <div class="event-description">Try a different category.</div>
          </div>
        </div>`;
      return;
    }
    for (const ev of items) {
      const img = ev.image || "static/rsc/slider/event1.jpg";
      const el = document.createElement("div");
      el.className = "event";
      el.innerHTML = `
        <img class="event-img" src="${img}" alt="${escapeHtml(ev.title || "")}" />
        <div class="event-content">
          <div class="event-title">${escapeHtml(ev.title || "")}</div>
          <div class="event-description">${escapeHtml((ev.description || "").slice(0,180))}</div>
          <div class="event-meta">
            <small>${escapeHtml(ev.location || "")} • ${ev.eventDate || ""} • ${ev.categoryName || ev.categoryname || ""}</small>
          </div>
        </div>`;
      container.appendChild(el);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]
    ));
  }

  async function loadByCategory(categoryValue) {
    const params = new URLSearchParams();
    if (categoryValue) params.set("category", categoryValue);

    try {
      const res = await fetch(`/eventdata?${params.toString()}`); // ← correct API
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { events = [] } = await res.json();                   // ← read { events }
      renderEventsToSlider(slider, events);
    } catch (err) {
      console.error("Failed to load events:", err);
      renderEventsToSlider(slider, []);
    }
  }

  loadByCategory(selectEl.value || "");           // initial load
  selectEl.addEventListener("change", () => {     // on change
    loadByCategory(selectEl.value || "");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const form   = document.querySelector(".event-search-form");
  const slider = document.getElementById("event-slider");

  async function loadEvents(params) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/eventdata?${qs}`);
    if (!res.ok) {
      console.error("Failed to fetch events", res.status);
      return render([]);
    }
    const { events = [] } = await res.json().catch(() => ({ events: [] }));
    render(events);
  }

  function render(events) {
    slider.innerHTML = "";
    if (!events.length) {
      slider.innerHTML =
        `<div class="event"><div class="event-title">No results</div></div>`;
      return;
    }
    for (const ev of events) {
      slider.insertAdjacentHTML("beforeend", `
        <div class="event">
          <img class="event-img" src="${ev.image || '/static/rsc/slider/event1.jpg'}" />
          <div class="event-content">
            <div class="event-title">${ev.title}</div>
            <div class="event-description">${ev.description || ""}</div>
            <div class="event-meta">
              <small>${ev.location || ""} • ${ev.eventDate || ""} • ${ev.categoryName || ""}</small>
            </div>
          </div>
        </div>`);
    }
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault(); // prevent full page reload

      const params = {
        keyword:   document.getElementById("search-word").value,
        category:  document.getElementById("categories").value,
        startDate: document.getElementById("start-date").value,
        time:      document.getElementById("event-time").value
      };
      loadEvents(params);
    });
  }

  // initial load (all events)
  loadEvents({});
});

