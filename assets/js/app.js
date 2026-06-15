// ----- Tab switching -----
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

function activate(id, keepHash) {
  tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === id));
  panels.forEach((p) => p.classList.toggle("is-active", p.id === id));
  if (!keepHash && location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  if (!keepHash) window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "announcements") loadAnnouncements();
  if (id === "updates") loadRoadmap();
  if (id === "blogs") loadBlogs();
}

tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.tab)));
document.querySelectorAll("[data-jump]").forEach((b) =>
  b.addEventListener("click", () => activate(b.dataset.jump))
);

// ----- Robust JSON fetch: cache-busting + timeout -----
async function fetchJson(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const url = path + (path.includes("?") ? "&" : "?") + "t=" + Date.now();
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function esc(s) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function errorBox(msg, retryFn) {
  const span = document.createElement("div");
  span.className = "rm-empty";
  span.innerHTML = esc(msg) + ' <button class="retry-btn">Retry</button>';
  span.querySelector(".retry-btn").addEventListener("click", retryFn);
  return span;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d)
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

// ----- Announcements (date-indexed: card grid + per-date detail pages) -----
let annData = null;
let annCat = "all";

// Stable color class per category, in declared order.
function catClass(cat, cats) {
  const i = Math.max(0, (cats || []).indexOf(cat));
  return "cc-" + ((i % 9) + 1);
}

function annById(id) {
  return (annData && annData.items || []).find((i) => i.id === id);
}

function renderAnnouncements() {
  const list = document.getElementById("annList");
  if (!annData) return;
  const cats = annData.categories || [];
  const q = (document.getElementById("annSearch").value || "").toLowerCase().trim();
  const items = (annData.items || []).filter((i) => {
    const hay = (i.title + " " + (i.summary || "") + " " + (i.category || "") + " " +
      (i.tags || []).join(" ") + " " +
      (i.details || []).map((d) => d.heading + " " + (d.points || []).join(" ")).join(" ")).toLowerCase();
    const okCat = annCat === "all" || i.category === annCat;
    const okQ = !q || hay.includes(q);
    return okCat && okQ;
  });

  if (!items.length) {
    list.innerHTML = '<div class="rm-empty">No matching announcements. Try a different search or filter.</div>';
    return;
  }

  list.innerHTML = items
    .map((i) => {
      const n = (i.details || []).length;
      const count = n ? `<span class="ann-count">${n} update${n === 1 ? "" : "s"}</span>` : "";
      return `<a class="card ann-tile" href="#a/${esc(i.id)}">
        <div class="ann-tile-top">
          <span class="ann-cat ${catClass(i.category, cats)}">${esc(i.category || "Update")}</span>
          <span class="ann-tile-date">${esc(i.dateLabel || fmtDate(i.date))}</span>
        </div>
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.summary || "")}</p>
        <div class="ann-tile-foot">${count}<span class="card-open">Open &rarr;</span></div>
      </a>`;
    })
    .join("");
}

function renderAnnDetail(id) {
  const wrap = document.getElementById("annDetail");
  const i = annById(id);
  if (!i) {
    wrap.innerHTML = '<div class="rm-empty">Announcement not found. <a href="#announcements">Back to all announcements</a>.</div>';
    return;
  }
  const cats = annData.categories || [];
  const tags = (i.tags || []).map((t) => `<span class="tag-pill">${esc(t)}</span>`).join("");
  const details = (i.details || [])
    .map((d) => {
      const pts = (d.points || []).map((p) => `<li>${esc(p)}</li>`).join("");
      const status = d.status ? `<span class="det-status">${esc(d.status)}</span>` : "";
      return `<article class="det-card">
        <div class="det-head"><h3>${esc(d.heading)}</h3>${status}</div>
        ${pts ? `<ul class="det-points">${pts}</ul>` : ""}
      </article>`;
    })
    .join("");
  const links = (i.links || [])
    .map((l) => `<a class="link-card" href="${esc(l.url)}" target="_blank" rel="noopener"><strong>${esc(l.label)}</strong><span>${esc(l.sub || "Open")}</span></a>`)
    .join("");

  wrap.innerHTML = `
    <header class="det-hero">
      <span class="ann-cat ${catClass(i.category, cats)}">${esc(i.category || "Update")}</span>
      <span class="det-date">${esc(i.dateLabel || fmtDate(i.date))}</span>
      <h1>${esc(i.title)}</h1>
      ${i.summary ? `<p class="lead">${esc(i.summary)}</p>` : ""}
      ${tags ? `<div class="tag-row">${tags}</div>` : ""}
    </header>
    <div class="det-grid">${details || '<div class="rm-empty">No further detail captured for this date.</div>'}</div>
    ${links ? `<h2 class="section-title">Related links</h2><div class="link-grid">${links}</div>` : ""}
  `;
}

function showAnnList() {
  document.getElementById("annDetailView").hidden = true;
  document.getElementById("annListView").hidden = false;
}
function showAnnDetail(id) {
  renderAnnDetail(id);
  document.getElementById("annListView").hidden = true;
  document.getElementById("annDetailView").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildAnnFilters() {
  const wrap = document.getElementById("annFilter");
  // Only include categories that actually appear, in declared order.
  const present = new Set((annData.items || []).map((i) => i.category));
  (annData.categories || []).filter((c) => present.has(c)).forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.cat = c;
    b.textContent = c;
    wrap.appendChild(b);
  });
  wrap.querySelectorAll(".chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      wrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      annCat = chip.dataset.cat;
      renderAnnouncements();
    })
  );
}

let annLoading = null;
async function loadAnnouncements() {
  if (annData) { renderAnnouncements(); routeAnnouncements(); return; }
  if (annLoading) return annLoading;
  const list = document.getElementById("annList");
  list.innerHTML = '<div class="rm-empty">Loading announcements&hellip;</div>';
  annLoading = (async () => {
    try {
      const data = await fetchJson("data/announcements.json");
      if (!data || !Array.isArray(data.items)) throw new Error("unexpected data shape");
      annData = data;
      const n = annData.items.length;
      const dets = annData.items.reduce((a, i) => a + (i.details || []).length, 0);
      document.getElementById("annMeta").innerHTML =
        `<span class="count-badge"><i class="dot-launch"></i>${n} announcements</span>` +
        `<span class="count-badge"><i class="dot-dev"></i>${dets} detailed updates</span>`;
      const d = annData.generatedAt ? new Date(annData.generatedAt) : null;
      document.getElementById("annUpdated").textContent = d
        ? "From the Copilot Announcements deck"
        : "";
      buildAnnFilters();
      renderAnnouncements();
      routeAnnouncements();
    } catch (e) {
      list.innerHTML = "";
      list.appendChild(errorBox("Couldn't load announcements.", loadAnnouncements));
    } finally {
      annLoading = null;
    }
  })();
  return annLoading;
}

// Hash routing for announcement detail pages: #a/<id>
// Toggles the announcements tab inline (does NOT call activate/loadAnnouncements,
// to avoid re-entrancy/recursion).
function routeAnnouncements() {
  if (!annData) return;
  const m = (location.hash || "").match(/^#a\/(.+)$/);
  if (m) {
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === "announcements"));
    panels.forEach((p) => p.classList.toggle("is-active", p.id === "announcements"));
    showAnnDetail(decodeURIComponent(m[1]));
  } else {
    showAnnList();
  }
}

document.getElementById("annSearch").addEventListener("input", renderAnnouncements);
document.getElementById("annBack").addEventListener("click", () => {
  history.pushState(null, "", "#announcements");
  showAnnList();
});
window.addEventListener("hashchange", routeAnnouncements);

// ----- Roadmap (Updates) -----
let roadmapData = null;
let activeStatus = "all";

function statusClass(s) {
  return s === "In development" ? "s-dev" : s === "Rolling out" ? "s-roll" : "s-launch";
}

function renderRoadmap() {
  const list = document.getElementById("roadmapList");
  if (!roadmapData) return;
  const q = (document.getElementById("roadmapSearch").value || "").toLowerCase().trim();
  const items = (roadmapData.items || []).filter((i) => {
    const okStatus = activeStatus === "all" || i.status === activeStatus;
    const okQ = !q || (i.title + " " + i.description).toLowerCase().includes(q);
    return okStatus && okQ;
  });

  if (!items.length) {
    list.innerHTML = '<div class="rm-empty">No matching features. Try a different search or filter.</div>';
    return;
  }

  list.innerHTML = items
    .map((i) => {
      const title = i.title.replace(/^Microsoft Copilot \(Microsoft 365\):\s*/i, "");
      const meta = [];
      if (i.availability) meta.push(`<span class="m">GA: ${esc(i.availability)}</span>`);
      if (i.preview) meta.push(`<span class="m">Preview: ${esc(i.preview)}</span>`);
      (i.platforms || []).slice(0, 4).forEach((p) => meta.push(`<span class="m">${esc(p)}</span>`));
      return `<article class="rm-card" data-s="${esc(i.status)}">
        <div class="rm-head">
          <h3 class="rm-title"><a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(title)}</a></h3>
          <span class="rm-status ${statusClass(i.status)}">${esc(i.status)}</span>
        </div>
        <p class="rm-desc">${esc(i.description)}</p>
        <div class="rm-meta">${meta.join("")}</div>
      </article>`;
    })
    .join("");
}

let roadmapLoading = null;
async function loadRoadmap() {
  if (roadmapData) { renderRoadmap(); return; }
  if (roadmapLoading) return roadmapLoading;
  const list = document.getElementById("roadmapList");
  list.innerHTML = '<div class="rm-empty">Loading the latest Copilot roadmap&hellip;</div>';
  roadmapLoading = (async () => {
    try {
      const data = await fetchJson("data/roadmap.json");
      if (!data || !Array.isArray(data.items)) throw new Error("unexpected data shape");
      roadmapData = data;
      const c = roadmapData.counts || {};
      document.getElementById("metaCounts").innerHTML =
        `<span class="count-badge"><i class="dot-dev"></i>${c.inDevelopment || 0} in development</span>` +
        `<span class="count-badge"><i class="dot-roll"></i>${c.rollingOut || 0} rolling out</span>` +
        `<span class="count-badge"><i class="dot-launch"></i>${c.launched || 0} launched</span>`;
      const d = roadmapData.generatedAt ? new Date(roadmapData.generatedAt) : null;
      document.getElementById("metaUpdated").textContent = d
        ? "Last updated " + d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
        : "";
      renderRoadmap();
    } catch (e) {
      list.innerHTML = "";
      list.appendChild(errorBox("Couldn't load roadmap data.", loadRoadmap));
    } finally {
      roadmapLoading = null;
    }
  })();
  return roadmapLoading;
}

document.getElementById("roadmapSearch").addEventListener("input", renderRoadmap);
document.querySelectorAll("#statusFilter .chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    document.querySelectorAll("#statusFilter .chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    activeStatus = chip.dataset.status;
    renderRoadmap();
  })
);

// ----- Blogs -----
let blogData = null;

function renderBlogs() {
  const list = document.getElementById("blogList");
  if (!blogData) return;
  const q = (document.getElementById("blogSearch").value || "").toLowerCase().trim();
  const items = (blogData.items || []).filter(
    (i) => !q || (i.title + " " + i.description).toLowerCase().includes(q)
  );
  if (!items.length) {
    list.innerHTML = '<div class="rm-empty">No matching posts. Try a different search.</div>';
    return;
  }
  list.innerHTML = items
    .map((i) => {
      const meta = [];
      if (i.date) meta.push(`<span class="m">${esc(fmtDate(i.date))}</span>`);
      if (i.source) meta.push(`<span class="m">${esc(i.source)}</span>`);
      return `<article class="rm-card blog-card">
        <div class="rm-head">
          <h3 class="rm-title"><a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title)}</a></h3>
        </div>
        ${i.description ? `<p class="rm-desc">${esc(i.description)}&hellip;</p>` : ""}
        <div class="rm-meta">${meta.join("")}</div>
      </article>`;
    })
    .join("");
}

let blogLoading = null;
async function loadBlogs() {
  if (blogData) { renderBlogs(); return; }
  if (blogLoading) return blogLoading;
  const list = document.getElementById("blogList");
  list.innerHTML = '<div class="rm-empty">Loading the latest Copilot blog posts&hellip;</div>';
  blogLoading = (async () => {
    try {
      const data = await fetchJson("data/blogs.json");
      if (!data || !Array.isArray(data.items)) throw new Error("unexpected data shape");
      blogData = data;
      document.getElementById("blogMeta").innerHTML =
        `<span class="count-badge"><i class="dot-launch"></i>${blogData.count || 0} recent posts</span>`;
      const d = blogData.generatedAt ? new Date(blogData.generatedAt) : null;
      document.getElementById("blogUpdated").textContent = d
        ? "Last updated " + d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
        : "";
      renderBlogs();
    } catch (e) {
      list.innerHTML = "";
      list.appendChild(errorBox("Couldn't load blog data.", loadBlogs));
    } finally {
      blogLoading = null;
    }
  })();
  return blogLoading;
}

document.getElementById("blogSearch").addEventListener("input", renderBlogs);

// Open the tab from the URL hash on load (after all state + handlers are defined)
const rawHash = location.hash || "#announcements";
const initial = rawHash.startsWith("#a/") ? "announcements" : rawHash.slice(1);
if (document.getElementById(initial)) activate(initial, rawHash.startsWith("#a/"));

// Preload all data in the background so tab content is ready instantly.
window.addEventListener("load", () => {
  setTimeout(() => { loadAnnouncements(); loadRoadmap(); loadBlogs(); }, 150);
});
