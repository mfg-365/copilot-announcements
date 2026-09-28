// ----- Tab switching -----
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

function activate(id, keepHash) {
  tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === id));
  panels.forEach((p) => p.classList.toggle("is-active", p.id === id));
  if (!keepHash && location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  if (!keepHash) window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "announcements") loadAnnouncements();
  if (id === "timeline") loadTimeline();
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

  // Header links (from the section/title slide) â€” shown directly under the header.
  const headerLinks = (i.headerLinks || [])
    .map((l) => `<a class="det-link" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="det-link-title">${esc(l.title)}</span><span class="det-link-host">${esc(hostOf(l.url))}</span></a>`)
    .join("");
  const linksBlock = headerLinks
    ? `<div class="det-links"><span class="det-links-label">Blogs &amp; articles</span><div class="det-links-grid">${headerLinks}</div></div>`
    : "";

  const details = (i.details || [])
    .map((d) => {
      const pts = (d.points || []).map((p) => `<li>${esc(p)}</li>`).join("");
      // Inline links from this feature's slide â€” rendered as active linked bullets.
      const linkPts = (d.links || [])
        .map((l) => `<li class="det-point-link"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a> <span class="det-point-host">${esc(hostOf(l.url))}</span></li>`)
        .join("");
      const allPts = pts + linkPts;
      const status = d.status ? `<span class="det-status">${esc(d.status)}</span>` : "";
      const imgs = (d.images || [])
        .map((im) => `<a class="det-shot" href="${esc(im.file)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(im.file)}" alt="${esc(d.heading)} screenshot" /></a>`)
        .join("");
      const gallery = imgs ? `<div class="det-shots">${imgs}</div>` : "";
      return `<article class="det-card">
        <div class="det-head"><h3>${esc(d.heading)}</h3>${status}</div>
        ${allPts ? `<ul class="det-points">${allPts}</ul>` : ""}
        ${gallery}
      </article>`;
    })
    .join("");

  wrap.innerHTML = `
    <header class="det-hero">
      <span class="ann-cat ${catClass(i.category, cats)}">${esc(i.category || "Update")}</span>
      <span class="det-date">${esc(i.dateLabel || fmtDate(i.date))}</span>
      <h1>${esc(i.title)}</h1>
      ${i.summary ? `<p class="lead">${esc(i.summary)}</p>` : ""}
      ${tags ? `<div class="tag-row">${tags}</div>` : ""}
      ${linksBlock}
    </header>
    <div class="det-grid">${details || '<div class="rm-empty">No further detail captured for this date.</div>'}</div>
    <button class="back-btn back-btn-bottom" id="annBackBottom">&larr; All announcements</button>
  `;

  // Wire the bottom back button (re-rendered each time, so bind here).
  const bottom = document.getElementById("annBackBottom");
  if (bottom) bottom.addEventListener("click", goBackToList);
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
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
function goBackToList() {
  history.pushState(null, "", "#announcements");
  showAnnList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.getElementById("annBack").addEventListener("click", goBackToList);
window.addEventListener("hashchange", routeAnnouncements);

// ----- Timeline (horizontal, newest on right, lazy thumbnails) -----
let timelineBuilt = false;

// Pick a representative thumbnail for an announcement (first detail image).
function thumbOf(item) {
  for (const d of item.details || []) {
    if (d.images && d.images.length) return d.images[0].file;
  }
  return null;
}

async function loadTimeline() {
  const track = document.getElementById("tlTrack");
  if (timelineBuilt) return;
  // Render as soon as data is available; never block on images.
  if (!annData) {
    track.innerHTML = '<div class="rm-empty">Loading timeline&hellip;</div>';
    try { await loadAnnouncements(); } catch { /* handled below */ }
  }
  if (!annData) {
    track.innerHTML = "";
    track.appendChild(errorBox("Couldn't load the timeline.", () => { timelineBuilt = false; loadTimeline(); }));
    return;
  }
  const cats = annData.categories || [];
  // Oldest -> newest so the most recent sits on the right.
  const items = [...annData.items].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let lastYear = null;
  const nodes = items
    .map((i, idx) => {
      const side = idx % 2 === 0 ? "below" : "above";
      const yr = (i.date || "").slice(0, 4);
      const yearTick = yr !== lastYear ? `<span class="tl-year">${esc(yr)}</span>` : "";
      lastYear = yr;
      const n = (i.details || []).length;
      const thumb = thumbOf(i);
      // Eagerly load only the most recent (rightmost) so it appears instantly;
      // the rest lazy-load as the user scrolls back.
      const eager = idx >= items.length - 2;
      const thumbHtml = thumb
        ? `<span class="tl-thumb"><img ${eager ? "" : 'loading="lazy"'} decoding="async" src="${esc(thumb)}" alt="" /></span>`
        : `<span class="tl-thumb tl-thumb-none ${catClass(i.category, cats)}" aria-hidden="true"></span>`;
      return `<a class="tl-node tl-${side}" href="#a/${esc(i.id)}">
        <div class="tl-card">
          ${thumbHtml}
          <div class="tl-card-body">
            <span class="ann-cat ${catClass(i.category, cats)}">${esc(i.category || "Update")}</span>
            <span class="tl-date">${esc(i.dateLabel || fmtDate(i.date))}</span>
            <strong class="tl-title">${esc(i.title)}</strong>
            ${i.summary ? `<span class="tl-desc">${esc(i.summary)}</span>` : ""}
            ${n ? `<span class="tl-count">${n} update${n === 1 ? "" : "s"}</span>` : ""}
          </div>
        </div>
        <span class="tl-dot ${catClass(i.category, cats)}"></span>
        ${yearTick}
      </a>`;
    })
    .join("");

  track.innerHTML = `<div class="tl-axis"></div>${nodes}`;
  timelineBuilt = true;

  // Jump to the most recent (right end) immediately so the latest is the starting view.
  const scroller = document.getElementById("tlScroll");
  scroller.scrollLeft = scroller.scrollWidth;
  requestAnimationFrame(() => { scroller.scrollLeft = scroller.scrollWidth; });
  enableDragScroll(scroller);
}

// Click-drag to pan the timeline horizontally.
function enableDragScroll(el) {
  let down = false, startX = 0, startLeft = 0, moved = false;
  el.addEventListener("pointerdown", (e) => {
    down = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft; el.classList.add("grabbing");
  });
  el.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    el.scrollLeft = startLeft - dx;
  });
  const end = () => { down = false; el.classList.remove("grabbing"); };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointerleave", end);
  // Prevent a drag from also triggering the node link.
  el.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
}

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

// Normalized URL for matching the Spotlight post against feed items.
function normLink(u) {
  return (u || "").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
}

function blogCard(i, featured) {
  const meta = [];
  if (i.date) meta.push(`<span class="m">${esc(fmtDate(i.date))}</span>`);
  if (i.source) meta.push(`<span class="m">${esc(i.source)}</span>`);
  return `<article class="rm-card blog-card${featured ? " is-featured" : ""}">
    ${featured ? '<span class="featured-badge">&#9733; Featured</span>' : ""}
    <div class="rm-head">
      <h3 class="rm-title"><a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title)}</a></h3>
    </div>
    ${i.description ? `<p class="rm-desc">${esc(i.description)}${featured ? "" : "&hellip;"}</p>` : ""}
    <div class="rm-meta">${meta.join("")}</div>
  </article>`;
}

function renderBlogs() {
  const list = document.getElementById("blogList");
  if (!blogData) return;
  const q = (document.getElementById("blogSearch").value || "").toLowerCase().trim();
  const matches = (i) => !q || (i.title + " " + (i.description || "")).toLowerCase().includes(q);

  // Pin the Spotlight post to the top. Use the feed's copy when present (and drop
  // it from the list so it isn't shown twice); otherwise build it from the config
  // so the pin survives even after the post ages out of the 30-item feed.
  let all = blogData.items || [];
  let featured = null;
  const sp = window.SPOTLIGHT;
  if (sp && sp.enabled && sp.pinBlog && sp.link) {
    const key = normLink(sp.link);
    const fromFeed = all.find((i) => normLink(i.link) === key);
    featured = {
      title: sp.blogTitle || (fromFeed && fromFeed.title) || sp.title,
      link: sp.link,
      description: sp.blogDescription || sp.lead,
      date: (fromFeed && fromFeed.date) || sp.date,
      source: sp.source || (fromFeed && fromFeed.source),
    };
    all = all.filter((i) => normLink(i.link) !== key);
  }

  const items = all.filter(matches);
  const showFeatured = featured && matches(featured);
  if (!items.length && !showFeatured) {
    list.innerHTML = '<div class="rm-empty">No matching posts. Try a different search.</div>';
    return;
  }
  list.innerHTML = (showFeatured ? blogCard(featured, true) : "") + items.map((i) => blogCard(i, false)).join("");
}

let blogLoading = null;
async function loadBlogs() {
  if (blogData) { renderBlogs(); renderRecentBlogs(); return; }
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
      renderRecentBlogs();
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

// Latest-blogs strip on the Announcements landing page. Reads the SAME blogData
// (data/blogs.json) as the Blogs tab, so it refreshes automatically whenever the
// Copilot Blogs feed updates. Shows the three most recent posts by date.
function renderRecentBlogs() {
  const wrap = document.getElementById("annRecentBlogs");
  const grid = document.getElementById("annRecentBlogsGrid");
  if (!wrap || !grid || !blogData) return;
  const items = (blogData.items || [])
    .slice()
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 3);
  if (!items.length) { wrap.hidden = true; return; }
  grid.innerHTML = items
    .map((i) => {
      const meta = [];
      if (i.date) meta.push(`<span class="m">${esc(fmtDate(i.date))}</span>`);
      if (i.source) meta.push(`<span class="m">${esc(i.source)}</span>`);
      return `<a class="recent-blog-card" href="${esc(i.link)}" target="_blank" rel="noopener">
        <span class="recent-blog-title">${esc(i.title)}</span>
        <span class="recent-blog-meta">${meta.join(' &middot; ')}</span>
      </a>`;
    })
    .join("");
  wrap.hidden = false;
}

// ----- Spotlight (featured launch banner, config: window.SPOTLIGHT in decks.config.js) -----
const SPOTLIGHT_ICONS = {
  home: '<path d="M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.8Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  code: '<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  autopilot: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1-5.1-1.9 5.1-1.9L12 3.5ZM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" fill="currentColor"/>',
};

function renderSpotlight() {
  const el = document.getElementById("spotlight");
  const sp = window.SPOTLIGHT;
  if (!el || !sp || !sp.enabled) return;
  const pillars = (sp.pillars || [])
    .map(
      (p) => `<div class="sp-pillar">
        <span class="sp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22">${SPOTLIGHT_ICONS[p.icon] || ""}</svg></span>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.text)}</p>
        ${p.status ? `<span class="sp-status sp-${esc(p.tone || "frontier")}">${esc(p.status)}</span>` : ""}
      </div>`
    )
    .join("");
  const also = (sp.alsoNew || []).length
    ? `<div class="sp-also"><span class="sp-also-label">Also new</span>${sp.alsoNew.map((a) => `<span class="sp-chip">${esc(a)}</span>`).join("")}</div>`
    : "";
  const video = sp.video && sp.video.url
    ? `<a class="btn btn-ghost" href="${esc(sp.video.url)}" target="_blank" rel="noopener">&#9654;&nbsp; ${esc(sp.video.label || "Watch the video")}</a>`
    : "";
  el.innerHTML = `
    <div class="sp-head">
      <span class="sp-kicker"><i></i>${esc(sp.kicker || "Spotlight")}${sp.date ? " &middot; " + esc(fmtDate(sp.date)) : ""}</span>
      <h2>${esc(sp.title)}</h2>
      ${sp.lead ? `<p class="sp-lead">${esc(sp.lead)}</p>` : ""}
    </div>
    <div class="sp-pillars">${pillars}</div>
    ${also}
    <div class="sp-actions">
      <a class="btn btn-primary" href="${esc(sp.link)}" target="_blank" rel="noopener">Read the announcement &rarr;</a>
      ${video}
    </div>`;
  el.hidden = false;
}
renderSpotlight();

// Open the tab from the URL hash on load (after all state + handlers are defined)
const rawHash = location.hash || "#announcements";
const initial = rawHash.startsWith("#a/") ? "announcements" : rawHash.slice(1);
if (document.getElementById(initial)) activate(initial, rawHash.startsWith("#a/"));

// Preload all data in the background so tab content is ready instantly.
window.addEventListener("load", () => {
  setTimeout(() => { loadAnnouncements(); loadRoadmap(); loadBlogs(); }, 150);
});
