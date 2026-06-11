/* ============================================================
   RideScan — app logic
   - Address autocomplete : Photon (OpenStreetMap, free, CORS)
   - Driving route        : OSRM public router (free, CORS)
   - Fares               : rate cards in rates.js + demand model
   ============================================================ */

(() => {
  "use strict";

  /* ---------- state ---------- */
  const state = {
    from: null,        // { lat, lng, label, short, city, country }
    to: null,
    route: null,       // { km, min, geometry }
    results: [],
    sort: "price",
  };

  /* ---------- elements ---------- */
  const $ = (id) => document.getElementById(id);
  const pickupInput = $("pickupInput");
  const dropoffInput = $("dropoffInput");
  const scanBtn = $("scanBtn");
  const errorMsg = $("errorMsg");
  const resultsEl = $("results");
  const resultList = $("resultList");
  const tripSummary = $("tripSummary");
  const resultsCount = $("resultsCount");
  let map, routeLayer;

  /* ============================================================
     Autocomplete (Photon)
     ============================================================ */
  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  async function fetchSuggestions(query) {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "5");
    // bias results toward the user's area once we know it
    const bias = state.from || state.to;
    if (bias) {
      url.searchParams.set("lat", bias.lat);
      url.searchParams.set("lon", bias.lng);
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("geocoder");
    const data = await res.json();
    return (data.features || []).map(featureToPlace);
  }

  function featureToPlace(f) {
    const p = f.properties;
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const main = p.name || street || p.city || "Location";
    const parts = [main, street !== main ? street : null, p.city || p.town || p.village, p.state, p.country]
      .filter(Boolean);
    return {
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      label: parts.join(", "),
      short: main || parts[0] || "Location",
      detail: parts.slice(1).join(", "),
      city: (p.city || p.town || p.village || p.county || "").toLowerCase(),
      state: p.state || "",
      country: (p.countrycode || "").toUpperCase(),
    };
  }

  function wireAutocomplete(input, boxId, key) {
    const box = $(boxId);
    let seq = 0;

    const run = debounce(async () => {
      const q = input.value.trim();
      state[key] = null;
      updateScanBtn();
      if (q.length < 3) { box.classList.remove("open"); return; }
      const mySeq = ++seq;
      try {
        const places = await fetchSuggestions(q);
        if (mySeq !== seq) return; // a newer query is in flight — drop this stale response
        box.innerHTML = "";
        places.forEach((pl) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "suggestion";
          b.innerHTML = `${escapeHtml(pl.short)}<small>${escapeHtml(pl.detail)}</small>`;
          b.addEventListener("click", () => {
            state[key] = pl;
            input.value = pl.label;
            box.classList.remove("open");
            updateScanBtn();
            if (key === "from" && !state.to) dropoffInput.focus();
          });
          box.appendChild(b);
        });
        box.classList.toggle("open", places.length > 0);
      } catch { box.classList.remove("open"); }
    }, 300);

    input.addEventListener("input", run);
    input.addEventListener("focus", () => { if (box.children.length && !state[key]) box.classList.add("open"); });
    document.addEventListener("click", (e) => {
      if (!box.parentElement.contains(e.target)) box.classList.remove("open");
    });
  }

  wireAutocomplete(pickupInput, "pickupSuggestions", "from");
  wireAutocomplete(dropoffInput, "dropoffSuggestions", "to");

  /* ---------- "use my location" ---------- */
  $("locateBtn").addEventListener("click", () => {
    if (!navigator.geolocation) return showError("Location not supported on this device.");
    pickupInput.value = "Locating…";
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const pl = data.features?.length
          ? featureToPlace(data.features[0])
          : { lat, lng, label: "Current location", short: "Current location", detail: "", city: "", country: "" };
        pl.lat = lat; pl.lng = lng;
        state.from = pl;
        pickupInput.value = pl.label || "Current location";
        updateScanBtn();
        dropoffInput.focus();
      } catch {
        state.from = { lat, lng, label: "Current location", short: "Current location", city: "", country: "" };
        pickupInput.value = "Current location";
        updateScanBtn();
      }
    }, () => {
      pickupInput.value = "";
      showError("Couldn't get your location — type your pickup instead.");
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  function updateScanBtn() { scanBtn.disabled = !(state.from && state.to); }

  /* ============================================================
     Routing (OSRM)
     ============================================================ */
  async function fetchRoute(from, to) {
    const url = `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("router");
    const data = await res.json();
    if (!data.routes?.length) throw new Error("no-route");
    const r = data.routes[0];
    return {
      km: r.distance / 1000,
      min: (r.duration / 60) * 1.18,   // +18% buffer: OSRM has no live traffic
      geometry: r.geometry,
    };
  }

  /* ============================================================
     Demand model — time-of-day surge estimate [low, high]
     ============================================================ */
  function demandFactor(date = new Date()) {
    const day = date.getDay();          // 0 Sun … 6 Sat
    const hr = date.getHours();
    const weekday = day >= 1 && day <= 5;
    if (weekday && ((hr >= 7 && hr < 10) || (hr >= 16 && hr < 19)))
      return { range: [1.15, 1.5], label: "rush hour" };
    if ((day === 5 || day === 6) && (hr >= 22 || hr < 3))
      return { range: [1.25, 1.8], label: "weekend night" };
    if (hr >= 1 && hr < 5)
      return { range: [1.1, 1.4], label: "late night" };
    return { range: [1.0, 1.15], label: null };
  }

  /* ============================================================
     Fare engine
     ============================================================ */
  function pickRateCard(svc, country) {
    const card = svc.rates[country] || svc.rates.default;
    if (!card) return null;
    // if we fell back to default but know the local currency, keep numbers, swap label
    if (!svc.rates[country] && COUNTRY_CURRENCY[country] && card.cur === "USD") {
      return { ...card };
    }
    return card;
  }

  function isAvailable(svc, place) {
    const country = place.country || "";
    const inCountry = svc.countries.includes("*") || svc.countries.includes(country);
    if (!inCountry) return false;
    if (svc.cities) {
      const hay = `${place.city} ${place.label}`.toLowerCase();
      return svc.cities.some((c) => hay.includes(c));
    }
    return true;
  }

  function quoteAll(trip) {
    const demand = demandFactor();
    const quotes = [];
    for (const svc of SERVICES) {
      if (!isAvailable(svc, trip.from)) continue;
      const card = pickRateCard(svc, trip.from.country);
      if (!card) continue;

      const raw = Math.max(card.min, card.base + card.perKm * trip.route.km + card.perMin * trip.route.min) + card.fee;
      const low = raw * demand.range[0];
      const high = raw * demand.range[1];

      quotes.push({
        svc,
        provider: PROVIDERS[svc.provider],
        cur: card.cur,
        low, high,
        mid: (low + high) / 2,
        wait: svc.wait,
        surge: demand.label,
        url: buildLink(svc, trip),
      });
    }
    return quotes;
  }

  function buildLink(svc, trip) {
    if (svc.link) return svc.link(trip);
    // products without their own deep link reuse the provider's main one (e.g. Uber products)
    const parent = SERVICES.find((s) => s.provider === svc.provider && s.link);
    return parent ? parent.link(trip) : "#";
  }

  /* value score: price dominates, pickup wait & comfort tip the scales */
  function valueScore(q, cheapest) {
    const priceRatio = q.mid / cheapest;             // 1.0 = cheapest
    const waitMid = (q.wait[0] + q.wait[1]) / 2;
    return priceRatio + waitMid / 60 - (q.svc.seats > 4 ? 0.02 : 0) - (q.svc.premium ? -0.0 : 0.03);
  }

  /* ============================================================
     Scan!
     ============================================================ */
  scanBtn.addEventListener("click", async () => {
    hideError();
    scanBtn.classList.add("scanning");
    scanBtn.disabled = true;

    resultsEl.hidden = false;
    resultList.innerHTML = '<div class="skeleton"></div>'.repeat(4);
    tripSummary.innerHTML = "";
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      state.route = await fetchRoute(state.from, state.to);
      const trip = { from: state.from, to: state.to, route: state.route };
      state.results = quoteAll(trip);
      renderTrip(trip);
      renderResults();
    } catch (e) {
      resultsEl.hidden = true;
      showError("Couldn't find a driving route between those points — try nearby addresses.");
    } finally {
      scanBtn.classList.remove("scanning");
      scanBtn.disabled = false;
    }
  });

  /* ---------- sorting ---------- */
  $("sortToggle").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.sort = btn.dataset.sort;
    document.querySelectorAll(".sort-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
    renderResults();
  });

  /* ============================================================
     Rendering
     ============================================================ */
  function renderTrip(trip) {
    tripSummary.innerHTML =
      `<span><strong>${escapeHtml(trip.from.short)}</strong> → <strong>${escapeHtml(trip.to.short)}</strong></span>` +
      `<span>${trip.route.km.toFixed(1)} km</span>` +
      `<span>~${Math.round(trip.route.min)} min drive</span>`;
    drawMap(trip);
  }

  function drawMap(trip) {
    if (!window.L) return;
    if (!map) {
      map = L.map("map", { zoomControl: false, attributionControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
    }
    if (routeLayer) routeLayer.remove();
    routeLayer = L.layerGroup().addTo(map);
    const line = L.geoJSON(trip.route.geometry, { style: { color: "#21d07a", weight: 4, opacity: 0.9 } });
    line.addTo(routeLayer);
    L.circleMarker([trip.from.lat, trip.from.lng], { radius: 6, color: "#21d07a", fillColor: "#21d07a", fillOpacity: 1 }).addTo(routeLayer);
    L.circleMarker([trip.to.lat, trip.to.lng], { radius: 6, color: "#ff5d73", fillColor: "#ff5d73", fillOpacity: 1 }).addTo(routeLayer);
    map.fitBounds(line.getBounds(), { padding: [24, 24] });
  }

  function renderResults() {
    const list = [...state.results];
    if (!list.length) {
      resultList.innerHTML = `<div class="unavailable-note">No ride services found for this region in our catalog yet.</div>`;
      resultsCount.textContent = "";
      return;
    }

    const cheapest = Math.min(...list.map((q) => q.mid));
    const fastest = Math.min(...list.map((q) => q.wait[0]));
    list.forEach((q) => { q.score = valueScore(q, cheapest); });

    if (state.sort === "price") list.sort((a, b) => a.mid - b.mid);
    else if (state.sort === "wait") list.sort((a, b) => (a.wait[0] + a.wait[1]) - (b.wait[0] + b.wait[1]));
    else list.sort((a, b) => a.score - b.score);

    const bestValue = [...list].sort((a, b) => a.score - b.score)[0];
    const providers = new Set(list.map((q) => q.provider.name));
    resultsCount.textContent = `${list.length} rides · ${providers.size} apps scanned`;

    resultList.innerHTML = "";
    list.forEach((q, i) => {
      const a = document.createElement("a");
      a.className = "ride-card" + (q === bestValue ? " best" : "");
      a.href = q.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.animationDelay = `${i * 45}ms`;

      let badge = "";
      if (q.mid === cheapest) badge = `<span class="badge">Cheapest</span>`;
      else if (q === bestValue) badge = `<span class="badge gold">Best value</span>`;
      else if (q.wait[0] === fastest && state.sort === "wait") badge = `<span class="badge blue">Fastest pickup</span>`;

      const fmt = currencyFormatter(q.cur);
      const surge = q.surge ? `<span class="surge">⚡ ${q.surge} pricing</span>` : "";

      a.innerHTML = `
        ${badge}
        <span class="provider-logo" style="background:${q.provider.color};color:${q.provider.textColor || "#fff"}">
          ${escapeHtml(q.provider.name[0])}
        </span>
        <span class="ride-info">
          <span class="ride-name">${escapeHtml(q.provider.name)} ${q.svc.name !== q.provider.name ? escapeHtml(q.svc.name) : ""}
            ${q.svc.sub ? `<span>· ${escapeHtml(q.svc.sub)}</span>` : ""}
          </span>
          <span class="ride-meta">
            <span>👤 ${q.svc.seats}</span>
            <span>🕐 ${q.wait[0]}–${q.wait[1]} min pickup</span>
            ${surge}
          </span>
        </span>
        <span class="ride-price">
          <span class="amount">${fmt(q.mid)}</span>
          <span class="range">${fmt(q.low)} – ${fmt(q.high)}</span>
          <span class="open-hint">Open in app →</span>
        </span>`;
      resultList.appendChild(a);
    });
  }

  /* ---------- helpers ---------- */
  function currencyFormatter(cur) {
    try {
      const f = new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: cur === "INR" || cur === "JPY" ? 0 : 0 });
      return (n) => f.format(Math.round(n));
    } catch {
      return (n) => `${cur} ${Math.round(n)}`;
    }
  }

  function showError(msg) { errorMsg.textContent = msg; errorMsg.hidden = false; }
  function hideError() { errorMsg.hidden = true; }
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- PWA ---------- */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
